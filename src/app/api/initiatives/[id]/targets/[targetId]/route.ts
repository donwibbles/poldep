import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { updateTargetSchema } from "@/lib/validations/initiative";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; targetId: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id, targetId } = await params;
  const body = await request.json();
  const parsed = updateTargetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const target = await prisma.initiativeTarget.findFirst({
    where: {
      id: targetId,
      initiativeId: id,
    },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      initiative: { select: { name: true } },
    },
  });

  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  // If response status is being set to a "responded" status and no responseDate, set it now
  const updateData: any = { ...parsed.data };
  if (
    parsed.data.responseStatus &&
    ["RESPONDED_POSITIVE", "RESPONDED_NEGATIVE", "RESPONDED_NEUTRAL"].includes(
      parsed.data.responseStatus
    ) &&
    !target.responseDate &&
    !parsed.data.responseDate
  ) {
    updateData.responseDate = new Date();
  }

  const updatedTarget = await prisma.initiativeTarget.update({
    where: { id: targetId },
    data: updateData,
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          type: true,
        },
      },
    },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "InitiativeTarget",
    entityId: targetId,
    summary: `Updated target ${target.contact.firstName} ${target.contact.lastName} on initiative "${target.initiative.name}"${parsed.data.responseStatus ? ` - status: ${parsed.data.responseStatus}` : ""}`,
    userId: session!.user.id,
  });

  return NextResponse.json(updatedTarget);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; targetId: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id, targetId } = await params;

  const target = await prisma.initiativeTarget.findFirst({
    where: {
      id: targetId,
      initiativeId: id,
    },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      initiative: { select: { name: true } },
    },
  });

  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  await prisma.initiativeTarget.delete({ where: { id: targetId } });

  await logActivity({
    action: "DELETE",
    entityType: "InitiativeTarget",
    entityId: targetId,
    summary: `Removed target ${target.contact.firstName} ${target.contact.lastName} from initiative "${target.initiative.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
