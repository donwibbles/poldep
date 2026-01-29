import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { addTargetsSchema } from "@/lib/validations/initiative";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const initiative = await prisma.outreachInitiative.findUnique({
    where: { id },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
  }

  const targets = await prisma.initiativeTarget.findMany({
    where: { initiativeId: id },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          type: true,
          title: true,
          organization: true,
          email: true,
          phone: true,
          party: true,
          district: true,
        },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ targets });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = addTargetsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const initiative = await prisma.outreachInitiative.findUnique({
    where: { id },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
  }

  // Verify all contacts exist and are appropriate types (elected officials or candidates)
  const contacts = await prisma.contact.findMany({
    where: {
      id: { in: parsed.data.contactIds },
      type: { in: ["ELECTED_OFFICIAL", "CANDIDATE"] },
    },
    select: { id: true, firstName: true, lastName: true },
  });

  if (contacts.length !== parsed.data.contactIds.length) {
    const foundIds = new Set(contacts.map((c) => c.id));
    const missingOrInvalid = parsed.data.contactIds.filter(
      (cid) => !foundIds.has(cid)
    );
    return NextResponse.json(
      {
        error:
          "Some contacts not found or are not elected officials/candidates",
        invalidIds: missingOrInvalid,
      },
      { status: 400 }
    );
  }

  // Check for existing targets to avoid duplicates
  const existingTargets = await prisma.initiativeTarget.findMany({
    where: {
      initiativeId: id,
      contactId: { in: parsed.data.contactIds },
    },
    select: { contactId: true },
  });
  const existingContactIds = new Set(existingTargets.map((t) => t.contactId));

  const newContactIds = parsed.data.contactIds.filter(
    (cid) => !existingContactIds.has(cid)
  );

  if (newContactIds.length === 0) {
    return NextResponse.json(
      { error: "All contacts are already targets of this initiative" },
      { status: 400 }
    );
  }

  // Create new targets
  await prisma.initiativeTarget.createMany({
    data: newContactIds.map((contactId) => ({
      initiativeId: id,
      contactId,
      priority: parsed.data.priority || 0,
    })),
  });

  const newContacts = contacts.filter((c) => newContactIds.includes(c.id));
  await logActivity({
    action: "UPDATE",
    entityType: "OutreachInitiative",
    entityId: id,
    summary: `Added ${newContactIds.length} target(s) to initiative "${initiative.name}": ${newContacts.map((c) => `${c.firstName} ${c.lastName}`).join(", ")}`,
    userId: session!.user.id,
  });

  // Return the created targets
  const targets = await prisma.initiativeTarget.findMany({
    where: {
      initiativeId: id,
      contactId: { in: newContactIds },
    },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          type: true,
          title: true,
          organization: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      targets,
      added: newContactIds.length,
      skipped: existingContactIds.size,
    },
    { status: 201 }
  );
}
