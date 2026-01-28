import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { endorsementSchema } from "@/lib/validations/endorsement";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const stageId = searchParams.get("stageId") || "";
  const decision = searchParams.get("decision") || "";
  const assignedToId = searchParams.get("assignedToId") || "";
  const candidateId = searchParams.get("candidateId") || "";
  const MAX_LIMIT = 100;
  const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (stageId) where.currentStageId = stageId;
  if (decision) where.decision = decision;
  if (assignedToId) where.assignedToId = assignedToId;
  if (candidateId) where.candidateId = candidateId;

  const [endorsements, total] = await Promise.all([
    prisma.endorsement.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        candidate: true,
        race: { include: { election: true } },
        currentStage: true,
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.endorsement.count({ where }),
  ]);

  return NextResponse.json({
    endorsements,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = endorsementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Validate previousEndorsementId if provided
  const { previousEndorsementId, ...endorsementData } = parsed.data as any;
  if (previousEndorsementId) {
    const previousEndorsement = await prisma.endorsement.findUnique({
      where: { id: previousEndorsementId },
    });
    if (!previousEndorsement) {
      return NextResponse.json({ error: "Previous endorsement not found" }, { status: 400 });
    }
    // Verify it's for the same candidate
    if (previousEndorsement.candidateId !== endorsementData.candidateId) {
      return NextResponse.json({ error: "Previous endorsement must be for the same candidate" }, { status: 400 });
    }
  }

  const endorsement = await prisma.endorsement.create({
    data: {
      ...endorsementData,
      previousEndorsementId: previousEndorsementId || null,
      stageHistory: {
        create: {
          stageId: endorsementData.currentStageId,
          enteredAt: new Date(),
        },
      },
    },
    include: { candidate: true, race: true, currentStage: true },
  });

  await logActivity({
    action: "CREATE",
    entityType: "Endorsement",
    entityId: endorsement.id,
    summary: `Created endorsement for ${endorsement.candidate.firstName} ${endorsement.candidate.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json(endorsement, { status: 201 });
}
