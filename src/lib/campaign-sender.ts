import { prisma } from "@/lib/db";
import { getResend } from "@/lib/resend";
import { applyMailMerge } from "@/lib/mail-merge";

const FROM_EMAIL = "UFW CRM <info@bigperro.dev>";

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

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
    return { success: false, sent: 0, failed: 0, errors: ["Campaign not found"] };
  }

  if (!campaign.subject || !campaign.body) {
    return { success: false, sent: 0, failed: 0, errors: ["Campaign subject and body are required"] };
  }

  if (campaign.recipients.length === 0) {
    return { success: false, sent: 0, failed: 0, errors: ["No recipients to send to"] };
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

  // Get contact details for mail merge
  const contactIds = campaign.recipients.map((r) => r.contactId);
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
  });
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  // Send emails in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < campaign.recipients.length; i += batchSize) {
    const batch = campaign.recipients.slice(i, i + batchSize);

    const sendPromises = batch.map(async (recipient) => {
      const contact = contactMap.get(recipient.contactId);
      if (!contact) {
        failed++;
        errors.push(`Contact not found for recipient ${recipient.id}`);
        return;
      }

      try {
        // Apply mail merge to subject and body
        const mergedSubject = applyMailMerge(campaign.subject!, contact);
        const mergedBody = applyMailMerge(campaign.body!, contact);

        // Wrap body in basic HTML structure
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
  ${mergedBody}
</body>
</html>`;

        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: recipient.email,
          subject: mergedSubject,
          html: htmlContent,
        });

        if (result.error) {
          failed++;
          errors.push(`Failed to send to ${recipient.email}: ${result.error.message}`);
          return;
        }

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
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed to send to ${recipient.email}: ${message}`);
      }
    });

    await Promise.all(sendPromises);

    // Small delay between batches to avoid rate limits
    if (i + batchSize < campaign.recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
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
    errors: errors.slice(0, 10), // Limit error messages
  };
}

export async function sendDripStep(
  campaignId: string,
  recipientId: string,
  stepOrder: number
): Promise<{ success: boolean; error?: string }> {
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

  const contact = await prisma.contact.findUnique({
    where: { id: recipient.contactId },
  });

  if (!contact) {
    return { success: false, error: "Contact not found" };
  }

  // Get subject and body (step can override template)
  const subject = step.subject || step.template.subject;
  const body = step.body || step.template.body;

  const mergedSubject = applyMailMerge(subject, contact);
  const mergedBody = applyMailMerge(body, contact);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
  ${mergedBody}
</body>
</html>`;

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipient.email,
      subject: mergedSubject,
      html: htmlContent,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
