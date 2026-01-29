import { prisma } from "@/lib/db";
import { getResend } from "@/lib/resend";
import { applyMailMerge, MailMergeContact } from "@/lib/mail-merge";
import { EMAIL_FROM } from "@/lib/email-config";
import { Contact, CampaignRecipient } from "@prisma/client";

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

// Configurable batch size via environment variable
const EMAIL_BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || "10", 10);

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(
  resend: ReturnType<typeof getResend>,
  params: { from: string; to: string | string[]; subject: string; html: string },
  retries = MAX_RETRIES
): Promise<{ success: boolean; data?: any; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await resend.emails.send(params);
      if (result.error) {
        // Don't retry on client errors (4xx)
        const isTransient =
          result.error.message?.includes("rate") ||
          result.error.message?.includes("timeout") ||
          result.error.message?.includes("temporarily");

        if (!isTransient || attempt === retries) {
          return { success: false, error: result.error.message };
        }
      } else {
        return { success: true, data: result.data };
      }
    } catch (error) {
      if (attempt === retries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // Exponential backoff
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
    await sleep(delay);
  }

  return { success: false, error: "Max retries exceeded" };
}

// Helper to build merge context for a contact
function buildMergeContext(contact: Contact, boss?: Contact | null): MailMergeContact {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    title: contact.title,
    organization: contact.organization,
    email: contact.email,
    phone: contact.phone,
    address: contact.address,
    city: contact.city,
    state: contact.state,
    zip: contact.zip,
    district: contact.district,
    party: contact.party,
    website: contact.website,
    bossFirstName: boss?.firstName ?? null,
    bossLastName: boss?.lastName ?? null,
    bossTitle: boss?.title ?? null,
    bossOrganization: boss?.organization ?? null,
    bossDistrict: boss?.district ?? null,
    bossParty: boss?.party ?? null,
  };
}

// Helper to wrap email body in HTML structure
function wrapHtmlContent(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
  ${body}
</body>
</html>`;
}

// Type for contact with staff assignments
type ContactWithStaff = Contact & {
  parentAssignments: Array<{
    parentContact: Contact;
  }>;
  staffAssignments: Array<{
    staffContact: Contact;
  }>;
};

export async function sendCampaign(campaignId: string): Promise<SendResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: {
        where: { sentAt: null },
      },
    },
  });

  if (!campaign) {
    return { success: false, sent: 0, failed: 0, skipped: 0, errors: ["Campaign not found"] };
  }

  if (!campaign.subject || !campaign.body) {
    return { success: false, sent: 0, failed: 0, skipped: 0, errors: ["Campaign subject and body are required"] };
  }

  if (campaign.recipients.length === 0) {
    return { success: false, sent: 0, failed: 0, skipped: 0, errors: ["No recipients to send to"] };
  }

  // Get suppressed emails
  const recipientEmails = campaign.recipients.map((r) => r.email.toLowerCase());
  const suppressedEmails = await prisma.emailSuppression.findMany({
    where: { email: { in: recipientEmails } },
    select: { email: true },
  });
  const suppressedSet = new Set(suppressedEmails.map((s) => s.email));

  // Filter out suppressed recipients (by their stored email)
  const activeRecipients = campaign.recipients.filter(
    (r) => !suppressedSet.has(r.email.toLowerCase())
  );
  let skippedCount = campaign.recipients.length - activeRecipients.length;

  if (activeRecipients.length === 0) {
    return {
      success: true,
      sent: 0,
      failed: 0,
      skipped: skippedCount,
      errors: skippedCount > 0 ? ["All recipients are suppressed"] : [],
    };
  }

  // Update campaign status to sending
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  const resend = getResend();
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Track all emails sent in this campaign run for deduplication
  const sentEmailsThisRun = new Set<string>();

  // Separate recipients by mode
  const directRecipients = activeRecipients.filter((r) => !r.emailStaff);
  const staffOutreachRecipients = activeRecipients.filter((r) => r.emailStaff);

  // BATCH LOAD: Fetch all contacts + staff/boss assignments in one query
  const allContactIds = activeRecipients.map((r) => r.contactId);
  const contactsWithRelations = await prisma.contact.findMany({
    where: { id: { in: allContactIds } },
    include: {
      parentAssignments: {
        where: { endDate: null },
        include: { parentContact: true },
        take: 1,
        orderBy: { createdAt: "asc" },
      },
      staffAssignments: {
        where: { endDate: null },
        include: { staffContact: true },
      },
    },
  });
  const contactMap = new Map<string, ContactWithStaff>(
    contactsWithRelations.map((c) => [c.id, c as ContactWithStaff])
  );

  // Also get suppression status for all potential staff emails
  const allStaffEmails: string[] = [];
  for (const recipient of staffOutreachRecipients) {
    const contact = contactMap.get(recipient.contactId);
    if (contact) {
      for (const sa of contact.staffAssignments) {
        if (sa.staffContact.email) {
          allStaffEmails.push(sa.staffContact.email.toLowerCase());
        }
      }
    }
  }
  if (allStaffEmails.length > 0) {
    const suppressedStaffEmails = await prisma.emailSuppression.findMany({
      where: { email: { in: allStaffEmails } },
      select: { email: true },
    });
    for (const s of suppressedStaffEmails) {
      suppressedSet.add(s.email);
    }
  }

  // Process direct recipients first
  for (let i = 0; i < directRecipients.length; i += EMAIL_BATCH_SIZE) {
    const batch = directRecipients.slice(i, i + EMAIL_BATCH_SIZE);

    const sendPromises = batch.map(async (recipient) => {
      const email = recipient.email.toLowerCase();

      // Dedupe - skip if already sent in this run
      if (sentEmailsThisRun.has(email)) {
        skippedCount++;
        return;
      }

      const contact = contactMap.get(recipient.contactId);
      if (!contact) {
        failed++;
        errors.push(`Contact not found for recipient ${recipient.id}`);
        return;
      }

      // Build enriched contact with boss fields for mail merge
      const boss = contact.parentAssignments[0]?.parentContact;
      const mergeContact = buildMergeContext(contact, boss);

      // Apply mail merge to subject and body
      const mergedSubject = applyMailMerge(campaign.subject!, mergeContact);
      const mergedBody = applyMailMerge(campaign.body!, mergeContact);
      const htmlContent = wrapHtmlContent(mergedBody);

      const result = await sendWithRetry(resend, {
        from: EMAIL_FROM,
        to: recipient.email,
        subject: mergedSubject,
        html: htmlContent,
      });

      if (!result.success) {
        failed++;
        errors.push(`Failed to send to ${recipient.email}: ${result.error}`);
        return;
      }

      sentEmailsThisRun.add(email);

      // Update recipient with resend ID and sent timestamp
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          sentAt: new Date(),
          resendId: result.data?.id || null,
        },
      });

      // Create a Communication record for tracking
      await prisma.communication.create({
        data: {
          type: "EMAIL",
          date: new Date(),
          subject: mergedSubject,
          notes: `Sent via campaign: ${campaign.name}`,
          contacts: {
            create: {
              contactId: recipient.contactId,
            },
          },
        },
      });

      sent++;
    });

    await Promise.all(sendPromises);

    // Small delay between batches to avoid rate limits
    if (i + EMAIL_BATCH_SIZE < directRecipients.length) {
      await sleep(100);
    }
  }

  // Process staff outreach recipients
  for (const recipient of staffOutreachRecipients) {
    const contact = contactMap.get(recipient.contactId);
    if (!contact) {
      failed++;
      errors.push(`Contact not found for staff outreach recipient ${recipient.id}`);
      continue;
    }

    // Get staff emails, dedupe within list, exclude suppressed
    const staffEmails = [...new Set(
      contact.staffAssignments
        .map((sa) => sa.staffContact.email?.toLowerCase())
        .filter((e): e is string => Boolean(e) && !suppressedSet.has(e!))
    )];

    // Filter out any emails already sent in this campaign run
    const newStaffEmails = staffEmails.filter((e) => !sentEmailsThisRun.has(e));

    // Determine what to send
    let toAddresses: string[];
    let isFallback = false;
    let staffContactIds: string[] = [];

    if (newStaffEmails.length > 0) {
      toAddresses = newStaffEmails;
      // Get contact IDs for communication records
      staffContactIds = contact.staffAssignments
        .filter((sa) => sa.staffContact.email && newStaffEmails.includes(sa.staffContact.email.toLowerCase()))
        .map((sa) => sa.staffContact.id);
    } else if (contact.email && !suppressedSet.has(contact.email.toLowerCase()) && !sentEmailsThisRun.has(contact.email.toLowerCase())) {
      // Fallback: if no staff with email, email boss directly
      toAddresses = [contact.email];
      isFallback = true;
      staffContactIds = [contact.id];
    } else {
      // Skip - no staff and boss either suppressed or already emailed
      skippedCount++;

      // Mark recipient as processed (skipped)
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          sentAt: new Date(),
          email: recipient.email + " (skipped - no staff or email)",
        },
      });
      continue;
    }

    // Mail merge uses BOSS info (including boss* fields pointing to self for template compatibility)
    const mergeContact: MailMergeContact = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      organization: contact.organization,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      city: contact.city,
      state: contact.state,
      zip: contact.zip,
      district: contact.district,
      party: contact.party,
      website: contact.website,
      // Boss fields = same as contact (for template compatibility in staff outreach)
      bossFirstName: contact.firstName,
      bossLastName: contact.lastName,
      bossTitle: contact.title,
      bossOrganization: contact.organization,
      bossDistrict: contact.district,
      bossParty: contact.party,
    };

    const mergedSubject = applyMailMerge(campaign.subject!, mergeContact);
    const mergedBody = applyMailMerge(campaign.body!, mergeContact);
    const htmlContent = wrapHtmlContent(mergedBody);

    // Send single email to all staff (or boss as fallback)
    const result = await sendWithRetry(resend, {
      from: EMAIL_FROM,
      to: toAddresses,
      subject: mergedSubject,
      html: htmlContent,
    });

    if (!result.success) {
      failed++;
      errors.push(`Failed to send staff outreach for ${contact.firstName} ${contact.lastName}: ${result.error}`);
      continue;
    }

    // Mark all sent emails as processed
    toAddresses.forEach((e) => sentEmailsThisRun.add(e.toLowerCase()));

    // Update recipient record
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        sentAt: new Date(),
        resendId: result.data?.id || null,
        // Store actual send targets for reference
        email: isFallback
          ? `${recipient.email} (fallback - sent directly)`
          : `${recipient.email} (staff: ${toAddresses.join(", ")})`,
      },
    });

    // Create Communication records for each staff contact who received the email
    for (const staffContactId of staffContactIds) {
      await prisma.communication.create({
        data: {
          type: "EMAIL",
          date: new Date(),
          subject: mergedSubject,
          notes: isFallback
            ? `Sent via campaign: ${campaign.name} (staff outreach fallback - sent to contact directly)`
            : `Sent via campaign: ${campaign.name} (staff outreach for ${contact.firstName} ${contact.lastName})`,
          contacts: {
            create: {
              contactId: staffContactId,
            },
          },
        },
      });
    }

    sent++;
  }

  // Update campaign stats
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: campaign.type === "ONE_TIME" ? "SENT" : "SENDING",
      sentAt: new Date(),
      totalSent: { increment: sent },
    },
  });

  return {
    success: failed === 0,
    sent,
    failed,
    skipped: skippedCount,
    errors: errors.slice(0, 10), // Limit error messages
  };
}

export async function sendDripStep(
  campaignId: string,
  recipientId: string,
  stepOrder: number
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      sequenceSteps: {
        where: { stepOrder },
        include: { template: true },
      },
    },
  });

  if (!campaign || campaign.sequenceSteps.length === 0) {
    return { success: false, error: "Campaign or step not found" };
  }

  const step = campaign.sequenceSteps[0];
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
  });

  if (!recipient) {
    return { success: false, error: "Recipient not found" };
  }

  // Check if email is suppressed
  const suppressed = await prisma.emailSuppression.findUnique({
    where: { email: recipient.email.toLowerCase() },
  });

  if (suppressed) {
    // Skip this recipient but don't fail
    return { success: true, skipped: true };
  }

  const contact = await prisma.contact.findUnique({
    where: { id: recipient.contactId },
    include: {
      parentAssignments: {
        where: { endDate: null },
        include: { parentContact: true },
        take: 1,
        orderBy: { createdAt: "asc" },
      },
      staffAssignments: {
        where: { endDate: null },
        include: { staffContact: true },
      },
    },
  });

  if (!contact) {
    return { success: false, error: "Contact not found" };
  }

  // Get subject and body (step can override template)
  const subject = step.subject || step.template.subject;
  const body = step.body || step.template.body;

  const resend = getResend();

  // Handle staff outreach mode
  if (recipient.emailStaff) {
    // Get suppression status for staff emails
    const staffEmails = contact.staffAssignments
      .map((sa) => sa.staffContact.email?.toLowerCase())
      .filter((e): e is string => Boolean(e));

    const suppressedStaff = staffEmails.length > 0
      ? await prisma.emailSuppression.findMany({
          where: { email: { in: staffEmails } },
          select: { email: true },
        })
      : [];
    const suppressedSet = new Set(suppressedStaff.map((s) => s.email));

    // Filter to non-suppressed staff
    const activeStaffEmails = staffEmails.filter((e) => !suppressedSet.has(e));

    let toAddresses: string[];
    let isFallback = false;
    let staffContactIds: string[] = [];

    if (activeStaffEmails.length > 0) {
      toAddresses = activeStaffEmails;
      staffContactIds = contact.staffAssignments
        .filter((sa) => sa.staffContact.email && activeStaffEmails.includes(sa.staffContact.email.toLowerCase()))
        .map((sa) => sa.staffContact.id);
    } else if (contact.email && !suppressed) {
      toAddresses = [contact.email];
      isFallback = true;
      staffContactIds = [contact.id];
    } else {
      return { success: true, skipped: true };
    }

    // Merge context uses boss info
    const mergeContact: MailMergeContact = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      organization: contact.organization,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      city: contact.city,
      state: contact.state,
      zip: contact.zip,
      district: contact.district,
      party: contact.party,
      website: contact.website,
      bossFirstName: contact.firstName,
      bossLastName: contact.lastName,
      bossTitle: contact.title,
      bossOrganization: contact.organization,
      bossDistrict: contact.district,
      bossParty: contact.party,
    };

    const mergedSubject = applyMailMerge(subject, mergeContact);
    const mergedBody = applyMailMerge(body, mergeContact);
    const htmlContent = wrapHtmlContent(mergedBody);

    const result = await sendWithRetry(resend, {
      from: EMAIL_FROM,
      to: toAddresses,
      subject: mergedSubject,
      html: htmlContent,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Calculate next step timing
    const nextStep = await prisma.sequenceStep.findFirst({
      where: {
        campaignId,
        stepOrder: stepOrder + 1,
      },
    });

    let nextSendAt = null;
    if (nextStep) {
      const now = new Date();
      nextSendAt = new Date(now.getTime() + nextStep.delayDays * 24 * 60 * 60 * 1000);
    }

    // Update recipient
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        sentAt: new Date(),
        resendId: result.data?.id || null,
        currentStep: stepOrder + 1,
        nextSendAt,
      },
    });

    // Update campaign stats
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalSent: { increment: 1 },
      },
    });

    // Create Communication records
    for (const staffContactId of staffContactIds) {
      await prisma.communication.create({
        data: {
          type: "EMAIL",
          date: new Date(),
          subject: mergedSubject,
          notes: isFallback
            ? `Sent via campaign: ${campaign.name} (Step ${stepOrder + 1}, staff outreach fallback)`
            : `Sent via campaign: ${campaign.name} (Step ${stepOrder + 1}, staff outreach for ${contact.firstName} ${contact.lastName})`,
          contacts: {
            create: {
              contactId: staffContactId,
            },
          },
        },
      });
    }

    return { success: true };
  }

  // Standard direct email flow
  const boss = contact.parentAssignments[0]?.parentContact;
  const mergeContact = buildMergeContext(contact, boss);

  const mergedSubject = applyMailMerge(subject, mergeContact);
  const mergedBody = applyMailMerge(body, mergeContact);
  const htmlContent = wrapHtmlContent(mergedBody);

  const result = await sendWithRetry(resend, {
    from: EMAIL_FROM,
    to: recipient.email,
    subject: mergedSubject,
    html: htmlContent,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Calculate next step timing
  const nextStep = await prisma.sequenceStep.findFirst({
    where: {
      campaignId,
      stepOrder: stepOrder + 1,
    },
  });

  let nextSendAt = null;
  if (nextStep) {
    const now = new Date();
    nextSendAt = new Date(now.getTime() + nextStep.delayDays * 24 * 60 * 60 * 1000);
  }

  // Update recipient
  await prisma.campaignRecipient.update({
    where: { id: recipientId },
    data: {
      sentAt: new Date(),
      resendId: result.data?.id || null,
      currentStep: stepOrder + 1,
      nextSendAt,
    },
  });

  // Update campaign stats
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      totalSent: { increment: 1 },
    },
  });

  // Create Communication record
  await prisma.communication.create({
    data: {
      type: "EMAIL",
      date: new Date(),
      subject: mergedSubject,
      notes: `Sent via campaign: ${campaign.name} (Step ${stepOrder + 1})`,
      contacts: {
        create: {
          contactId: recipient.contactId,
        },
      },
    },
  });

  return { success: true };
}
