import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { applyMailMerge, MailMergeContact } from "@/lib/mail-merge";
import { Contact } from "@prisma/client";

// Helper to build consistent merge context
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

interface PreviewItem {
  recipientId: string;
  contactName: string;
  contactType: string;
  mode: "direct" | "staff_outreach";
  toAddresses: string[];
  staffCount?: number;
  isFallback?: boolean;
  subject: string;
  body: string;
  emailStaff: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = parseInt(searchParams.get("offset") || "0");

  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Fetch recipients with STABLE ordering for pagination
  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId: id },
    skip: offset,
    take: limit,
    orderBy: { id: "asc" }, // Stable order prevents duplicates/skips
  });

  // BATCH LOAD: Fetch all contacts with staff info in one query
  const contactIds = recipients.map((r) => r.contactId);
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
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
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  const previews: PreviewItem[] = recipients.map((recipient) => {
    const contact = contactMap.get(recipient.contactId);

    if (!contact) {
      return {
        recipientId: recipient.id,
        contactName: "Unknown Contact",
        contactType: "UNKNOWN",
        mode: "direct" as const,
        toAddresses: [recipient.email],
        subject: campaign.subject || "",
        body: campaign.body || "",
        emailStaff: recipient.emailStaff,
      };
    }

    if (recipient.emailStaff) {
      // Staff outreach preview
      const staffEmails = contact.staffAssignments
        .map((sa) => sa.staffContact.email)
        .filter((e): e is string => Boolean(e));
      const isFallback = staffEmails.length === 0;
      const toAddresses = isFallback
        ? contact.email
          ? [contact.email]
          : []
        : staffEmails;

      // Merge context uses boss info (contact = boss for staff outreach)
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
        // Boss fields = same as contact for staff outreach
        bossFirstName: contact.firstName,
        bossLastName: contact.lastName,
        bossTitle: contact.title,
        bossOrganization: contact.organization,
        bossDistrict: contact.district,
        bossParty: contact.party,
      };

      return {
        recipientId: recipient.id,
        contactName: `${contact.firstName} ${contact.lastName}`,
        contactType: contact.type,
        mode: "staff_outreach" as const,
        toAddresses,
        staffCount: staffEmails.length,
        isFallback,
        subject: applyMailMerge(campaign.subject || "", mergeContact),
        body: applyMailMerge(campaign.body || "", mergeContact),
        emailStaff: recipient.emailStaff,
      };
    } else {
      // Direct email preview
      const boss = contact.parentAssignments[0]?.parentContact;
      const mergeContact = buildMergeContext(contact, boss);

      return {
        recipientId: recipient.id,
        contactName: `${contact.firstName} ${contact.lastName}`,
        contactType: contact.type,
        mode: "direct" as const,
        toAddresses: [recipient.email],
        subject: applyMailMerge(campaign.subject || "", mergeContact),
        body: applyMailMerge(campaign.body || "", mergeContact),
        emailStaff: recipient.emailStaff,
      };
    }
  });

  const totalCount = await prisma.campaignRecipient.count({
    where: { campaignId: id },
  });

  // Count by mode for summary stats
  const staffOutreachCount = await prisma.campaignRecipient.count({
    where: { campaignId: id, emailStaff: true },
  });
  const directCount = totalCount - staffOutreachCount;

  return NextResponse.json({
    previews,
    totalCount,
    directCount,
    staffOutreachCount,
    limit,
    offset,
    note: "Preview shows current staff assignments. Actual send uses live data at send time.",
  });
}
