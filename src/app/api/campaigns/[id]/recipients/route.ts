import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { addRecipientsSchema } from "@/lib/validations/campaign";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const [recipients, total] = await Promise.all([
    prisma.campaignRecipient.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.campaignRecipient.count({ where: { campaignId: id } }),
  ]);

  // Get contact details for display, including staff count for emailStaff recipients
  const contactIds = recipients.map((r) => r.contactId);
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      organization: true,
      type: true,
      staffAssignments: {
        where: { endDate: null },
        select: {
          staffContact: {
            select: { email: true },
          },
        },
      },
    },
  });

  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const enrichedRecipients = recipients.map((r) => {
    const contact = contactMap.get(r.contactId);
    const staffWithEmail = contact?.staffAssignments.filter(
      (sa) => sa.staffContact.email
    ).length ?? 0;
    return {
      ...r,
      contact: contact
        ? {
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            organization: contact.organization,
            type: contact.type,
          }
        : null,
      staffCount: r.emailStaff ? staffWithEmail : undefined,
    };
  });

  return NextResponse.json({
    recipients: enrichedRecipients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = addRecipientsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Only allow adding recipients to drafts
  if (campaign.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Can only add recipients to draft campaigns" },
      { status: 400 }
    );
  }

  const { contactIds, emailStaff } = parsed.data;

  // Get contacts with valid emails
  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: contactIds },
      email: { not: null },
    },
    select: { id: true, email: true, type: true },
  });

  // Reject emailStaff=true for STAFF type contacts
  if (emailStaff) {
    const staffContacts = contacts.filter((c) => c.type === "STAFF");
    if (staffContacts.length > 0) {
      return NextResponse.json(
        { error: 'Staff contacts cannot use "Email their staff" mode' },
        { status: 400 }
      );
    }
  }

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "No contacts with valid email addresses found" },
      { status: 400 }
    );
  }

  // Filter out contacts that are already recipients
  const existingRecipients = await prisma.campaignRecipient.findMany({
    where: {
      campaignId: id,
      contactId: { in: contacts.map((c) => c.id) },
    },
    select: { contactId: true },
  });

  const existingIds = new Set(existingRecipients.map((r) => r.contactId));
  const newContacts = contacts.filter((c) => !existingIds.has(c.id));

  if (newContacts.length === 0) {
    return NextResponse.json(
      { error: "All selected contacts are already recipients" },
      { status: 400 }
    );
  }

  // Create recipients
  await prisma.campaignRecipient.createMany({
    data: newContacts.map((contact) => ({
      campaignId: id,
      contactId: contact.id,
      email: contact.email!,
      emailStaff: emailStaff ?? false,
    })),
  });

  // Update total recipients count
  const totalRecipients = await prisma.campaignRecipient.count({
    where: { campaignId: id },
  });

  await prisma.campaign.update({
    where: { id },
    data: { totalRecipients },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Campaign",
    entityId: id,
    summary: `Added ${newContacts.length} recipients to campaign "${campaign.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json({
    added: newContacts.length,
    skipped: contacts.length - newContacts.length,
    total: totalRecipients,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { contactIds } = body;

  if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json(
      { error: "contactIds array is required" },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Only allow removing recipients from drafts
  if (campaign.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Can only remove recipients from draft campaigns" },
      { status: 400 }
    );
  }

  const deleted = await prisma.campaignRecipient.deleteMany({
    where: {
      campaignId: id,
      contactId: { in: contactIds },
    },
  });

  // Update total recipients count
  const totalRecipients = await prisma.campaignRecipient.count({
    where: { campaignId: id },
  });

  await prisma.campaign.update({
    where: { id },
    data: { totalRecipients },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Campaign",
    entityId: id,
    summary: `Removed ${deleted.count} recipients from campaign "${campaign.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json({
    removed: deleted.count,
    total: totalRecipients,
  });
}
