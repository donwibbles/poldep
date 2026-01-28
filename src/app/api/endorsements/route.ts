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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (stageId) where.currentStageId = stageId;
  if (decision) where.decision = decision;
  if (assignedToId) where.assignedToId = assignedToId;

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

  const endorsement = await prisma.endorsement.create({
    data: {
      ...parsed.data,
      stageHistory: {
        create: {
          stageId: parsed.data.currentStageId,
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
