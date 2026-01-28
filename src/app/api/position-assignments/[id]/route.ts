import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { endPositionSchema } from "@/lib/validations/position-assignment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const assignment = await prisma.positionAssignment.findUnique({
    where: { id },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Position assignment not found" }, { status: 404 });
  }

  return NextResponse.json(assignment);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = endPositionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.positionAssignment.findUnique({
    where: { id },
    include: { contact: { select: { firstName: true, lastName: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Position assignment not found" }, { status: 404 });
  }

  const assignment = await prisma.positionAssignment.update({
    where: { id },
    data: {
      endDate: parsed.data.endDate,
      notes: parsed.data.notes !== undefined ? parsed.data.notes : existing.notes,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "PositionAssignment",
    entityId: id,
    summary: `Ended position "${assignment.positionTitle}" for ${assignment.contact.firstName} ${assignment.contact.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json(assignment);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.positionAssignment.findUnique({
    where: { id },
    include: { contact: { select: { firstName: true, lastName: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Position assignment not found" }, { status: 404 });
  }

  await prisma.positionAssignment.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "PositionAssignment",
    entityId: id,
    summary: `Deleted position "${existing.positionTitle}" from ${existing.contact.firstName} ${existing.contact.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
