import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { communicationSchema } from "@/lib/validations/communication";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const communication = await prisma.communication.findUnique({
    where: { id },
    include: {
      contacts: { include: { contact: true } },
      endorsement: { include: { candidate: true } },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!communication) return NextResponse.json({ error: "Communication not found" }, { status: 404 });
  return NextResponse.json(communication);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = communicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { contactIds, ...data } = parsed.data;

  const communication = await prisma.$transaction(async (tx) => {
    await tx.communicationContact.deleteMany({ where: { communicationId: id } });
    return tx.communication.update({
      where: { id },
      data: {
        ...data,
        contacts: {
          create: contactIds.map((contactId: string) => ({ contactId })),
        },
      },
      include: { contacts: { include: { contact: true } } },
    });
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Communication",
    entityId: id,
    summary: `Updated communication: ${communication.subject}`,
    userId: session!.user.id,
  });

  return NextResponse.json(communication);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.communication.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Communication not found" }, { status: 404 });

  await prisma.communication.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "Communication",
    entityId: id,
    summary: `Deleted communication: ${existing.subject}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
