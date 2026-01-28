import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { contactSchema } from "@/lib/validations/contact";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      parentContact: true,
      staffMembers: true,
      communications: {
        include: {
          communication: {
            include: {
              contacts: {
                include: { contact: true },
              },
            },
          },
        },
        orderBy: { communication: { date: "desc" } },
      },
      endorsements: {
        include: {
          race: { include: { election: true } },
          currentStage: true,
        },
      },
      raceCandidates: {
        include: {
          race: { include: { election: true } },
        },
      },
      tasks: {
        orderBy: { dueDate: "asc" },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: parsed.data,
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Contact",
    entityId: contact.id,
    summary: `Updated contact ${contact.firstName} ${contact.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json(contact);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await prisma.contact.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "Contact",
    entityId: id,
    summary: `Deleted contact ${existing.firstName} ${existing.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
