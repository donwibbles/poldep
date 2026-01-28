import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { updateStaffAssignmentSchema } from "@/lib/validations/staff-assignment";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateStaffAssignmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.staffAssignment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const updateData: { role?: string | null; endDate?: Date; notes?: string | null } = {};
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.endDate !== undefined) updateData.endDate = parsed.data.endDate;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const assignment = await prisma.staffAssignment.update({
    where: { id },
    data: updateData,
    include: {
      staffContact: { select: { id: true, firstName: true, lastName: true } },
      parentContact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const isEnding = parsed.data.endDate !== undefined;
  const summary = isEnding
    ? `Ended assignment of ${assignment.staffContact.firstName} ${assignment.staffContact.lastName} from ${assignment.parentContact.firstName} ${assignment.parentContact.lastName}`
    : `Updated assignment of ${assignment.staffContact.firstName} ${assignment.staffContact.lastName} to ${assignment.parentContact.firstName} ${assignment.parentContact.lastName}`;

  await logActivity({
    action: "UPDATE",
    entityType: "StaffAssignment",
    entityId: assignment.id,
    summary,
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

  const existing = await prisma.staffAssignment.findUnique({
    where: { id },
    include: {
      staffContact: { select: { firstName: true, lastName: true } },
      parentContact: { select: { firstName: true, lastName: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.staffAssignment.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "StaffAssignment",
    entityId: id,
    summary: `Deleted assignment of ${existing.staffContact.firstName} ${existing.staffContact.lastName} from ${existing.parentContact.firstName} ${existing.parentContact.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
