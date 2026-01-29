import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { z } from "zod";
import { OFFICE_LEVELS } from "@/lib/constants";

const bulkRecipientsSchema = z.object({
  mode: z.enum(["all_with_email", "by_filter", "by_tags"]),
  filters: z
    .object({
      type: z.string().optional(),
      state: z.string().optional(),
      party: z.string().optional(),
      officeLevel: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  emailStaff: z.boolean().optional().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = bulkRecipientsSchema.safeParse(body);

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

  if (campaign.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Can only add recipients to draft campaigns" },
      { status: 400 }
    );
  }

  // Build the where clause based on mode
  const where: any = {
    email: { not: null },
  };

  const { mode, filters, tags, emailStaff } = parsed.data;

  if (mode === "by_filter" && filters) {
    if (filters.type) {
      // If emailStaff is true, reject STAFF type filter
      if (emailStaff && filters.type === "STAFF") {
        return NextResponse.json(
          { error: 'Staff contacts cannot use "Email their staff" mode' },
          { status: 400 }
        );
      }
      where.type = filters.type;
    } else if (emailStaff) {
      // If no type filter but emailStaff is true, exclude STAFF type
      where.type = { not: "STAFF" };
    }
    if (filters.state) {
      where.state = filters.state;
    }
    if (filters.party) {
      where.party = filters.party;
    }
    if (filters.officeLevel) {
      const positionTitles =
        OFFICE_LEVELS[filters.officeLevel as keyof typeof OFFICE_LEVELS] || [];
      if (positionTitles.length > 0) {
        where.positionAssignments = {
          some: {
            positionTitle: { in: positionTitles as unknown as string[] },
            endDate: null,
          },
        };
      }
    }
  } else if (mode === "by_tags" && tags && tags.length > 0) {
    where.tags = { hasSome: tags };
    // If emailStaff is true, exclude STAFF type
    if (emailStaff) {
      where.type = { not: "STAFF" };
    }
  } else if (emailStaff) {
    // For "all_with_email" mode with emailStaff, exclude STAFF type
    where.type = { not: "STAFF" };
  }
  // mode === "all_with_email" without emailStaff just uses the base where clause (email not null)

  // Get all matching contacts
  const contacts = await prisma.contact.findMany({
    where,
    select: { id: true, email: true },
  });

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "No contacts found matching the criteria" },
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
    return NextResponse.json({
      added: 0,
      skipped: contacts.length,
      total: await prisma.campaignRecipient.count({ where: { campaignId: id } }),
      message: "All matching contacts are already recipients",
    });
  }

  // Create recipients in batches to avoid memory issues
  const batchSize = 500;
  for (let i = 0; i < newContacts.length; i += batchSize) {
    const batch = newContacts.slice(i, i + batchSize);
    await prisma.campaignRecipient.createMany({
      data: batch.map((contact) => ({
        campaignId: id,
        contactId: contact.id,
        email: contact.email!,
        emailStaff: emailStaff ?? false,
      })),
    });
  }

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
    summary: `Bulk added ${newContacts.length} recipients to campaign "${campaign.name}" (mode: ${mode})`,
    userId: session!.user.id,
  });

  return NextResponse.json({
    added: newContacts.length,
    skipped: contacts.length - newContacts.length,
    total: totalRecipients,
  });
}

// Preview endpoint to show count before adding
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("mode") || "all_with_email";
  const type = searchParams.get("type") || "";
  const state = searchParams.get("state") || "";
  const party = searchParams.get("party") || "";
  const officeLevel = searchParams.get("officeLevel") || "";
  const tagsParam = searchParams.get("tags") || "";
  const tags = tagsParam ? tagsParam.split(",") : [];

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Build the where clause
  const where: any = {
    email: { not: null },
  };

  if (mode === "by_filter") {
    if (type) where.type = type;
    if (state) where.state = state;
    if (party) where.party = party;
    if (officeLevel) {
      const positionTitles =
        OFFICE_LEVELS[officeLevel as keyof typeof OFFICE_LEVELS] || [];
      if (positionTitles.length > 0) {
        where.positionAssignments = {
          some: {
            positionTitle: { in: positionTitles as unknown as string[] },
            endDate: null,
          },
        };
      }
    }
  } else if (mode === "by_tags" && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  const [totalMatching, existingCount] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.campaignRecipient.count({
      where: {
        campaignId: id,
        contactId: {
          in: (
            await prisma.contact.findMany({
              where,
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
    }),
  ]);

  return NextResponse.json({
    totalMatching,
    alreadyAdded: existingCount,
    willAdd: totalMatching - existingCount,
  });
}
