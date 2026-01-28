import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { endorsementSchema } from "@/lib/validations/endorsement";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const endorsement = await prisma.endorsement.findUnique({
    where: { id },
    include: {
      candidate: true,
      race: { include: { election: true } },
      currentStage: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      stageHistory: {
        include: { stage: true },
        orderBy: { enteredAt: "asc" },
      },
      communications: {
        include: { contacts: { include: { contact: true } } },
        orderBy: { date: "desc" },
      },
      tasks: { orderBy: { dueDate: "asc" } },
      attachments: { orderBy: { createdAt: "desc" } },
      previousEndorsement: {
        include: {
          race: { include: { election: true } },
        },
      },
      reEndorsements: {
        include: {
          race: { include: { election: true } },
          currentStage: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!endorsement) {
    return NextResponse.json({ error: "Endorsement not found" }, { status: 404 });
  }

  return NextResponse.json(endorsement);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.endorsement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Endorsement not found" }, { status: 404 });
  }

  // Check soft lock for MEMBER users
  if (existing.lockedAt && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "This endorsement has been finalized and cannot be edited." }, { status: 403 });
  }

  const body = await request.json();

  // If admin is overriding a locked endorsement, require reason
  if (existing.lockedAt && session!.user.role === "ADMIN") {
    if (!body.overrideReason) {
      return NextResponse.json({ error: "Override reason is required for editing finalized endorsements." }, { status: 400 });
    }
    await logActivity({
      action: "OVERRIDE_EDIT",
      entityType: "Endorsement",
      entityId: id,
      summary: `Admin override edit on finalized endorsement`,
      metadata: { reason: body.overrideReason },
      userId: session!.user.id,
    });
  }

  const parsed = endorsementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const endorsement = await prisma.endorsement.update({
    where: { id },
    data: {
      candidateId: parsed.data.candidateId,
      raceId: parsed.data.raceId,
      assignedToId: parsed.data.assignedToId,
      notes: parsed.data.notes,
    },
    include: { candidate: true, race: true, currentStage: true },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Endorsement",
    entityId: id,
    summary: `Updated endorsement for ${endorsement.candidate.firstName} ${endorsement.candidate.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json(endorsement);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.endorsement.findUnique({
    where: { id },
    include: { candidate: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Endorsement not found" }, { status: 404 });
  }

  if (existing.lockedAt && session!.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Cannot delete a finalized endorsement." }, { status: 403 });
  }

  await prisma.endorsement.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "Endorsement",
    entityId: id,
    summary: `Deleted endorsement for ${existing.candidate.firstName} ${existing.candidate.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
