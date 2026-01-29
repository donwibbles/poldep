import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { advanceStageSchema } from "@/lib/validations/endorsement";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = advanceStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const endorsement = await prisma.endorsement.findUnique({
    where: { id },
    include: { currentStage: true, candidate: true },
  });

  if (!endorsement) {
    return NextResponse.json({ error: "Endorsement not found" }, { status: 404 });
  }

  if (endorsement.lockedAt) {
    return NextResponse.json({ error: "This endorsement has been finalized." }, { status: 403 });
  }

  const targetStage = await prisma.pipelineStage.findUnique({
    where: { id: parsed.data.stageId },
  });

  if (!targetStage) {
    return NextResponse.json({ error: "Target stage not found" }, { status: 404 });
  }

  // Determine decision based on stage configuration or fall back to name matching
  let decision: "PENDING" | "ENDORSED" | "NOT_ENDORSED" | "NO_ENDORSEMENT" = "PENDING";
  let lockedAt: Date | null = null;

  if (targetStage.isFinal) {
    lockedAt = new Date();
    // Use configured decision if available, otherwise fall back to name matching
    if (targetStage.decisionOnComplete) {
      decision = targetStage.decisionOnComplete;
    } else {
      // Fallback for stages without decisionOnComplete configured
      const stageName = targetStage.name.toLowerCase();
      if (stageName.includes("not endorsed")) {
        decision = "NOT_ENDORSED";
      } else if (stageName.includes("no endorsement")) {
        decision = "NO_ENDORSEMENT";
      } else if (stageName.includes("endorsed")) {
        decision = "ENDORSED";
      }
    }
  }

  // Update in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Close current stage history entry
    await tx.endorsementStageHistory.updateMany({
      where: {
        endorsementId: id,
        exitedAt: null,
      },
      data: { exitedAt: new Date() },
    });

    // Create new stage history entry
    await tx.endorsementStageHistory.create({
      data: {
        endorsementId: id,
        stageId: parsed.data.stageId,
        enteredAt: new Date(),
        notes: parsed.data.notes,
      },
    });

    // Update endorsement
    return tx.endorsement.update({
      where: { id },
      data: {
        currentStageId: parsed.data.stageId,
        decision,
        lockedAt,
      },
      include: {
        candidate: true,
        currentStage: true,
        race: { include: { election: true } },
      },
    });
  });

  await logActivity({
    action: "ADVANCE_STAGE",
    entityType: "Endorsement",
    entityId: id,
    summary: `Advanced ${updated.candidate.firstName} ${updated.candidate.lastName} to ${updated.currentStage.name}`,
    metadata: { fromStage: endorsement.currentStage.name, toStage: targetStage.name, notes: parsed.data.notes },
    userId: session!.user.id,
  });

  return NextResponse.json(updated);
}
