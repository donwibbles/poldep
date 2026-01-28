import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi, requireAdminApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { pipelineStageSchema, reorderStagesSchema } from "@/lib/validations/pipeline";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const stages = await prisma.pipelineStage.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { endorsements: true } },
    },
  });

  return NextResponse.json({ stages });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json();
  const parsed = pipelineStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Auto-calculate next order to avoid unique constraint violation
  const maxOrder = await prisma.pipelineStage.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const stage = await prisma.pipelineStage.create({
    data: { ...parsed.data, order: nextOrder },
  });

  await logActivity({
    action: "CREATE",
    entityType: "PipelineStage",
    entityId: stage.id,
    summary: `Created pipeline stage: ${stage.name}`,
    userId: session!.user.id,
  });

  return NextResponse.json(stage, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json();
  const parsed = reorderStagesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.stages.map((s) =>
      prisma.pipelineStage.update({
        where: { id: s.id },
        data: { order: s.order },
      })
    )
  );

  await logActivity({
    action: "REORDER",
    entityType: "PipelineStage",
    entityId: "all",
    summary: "Reordered pipeline stages",
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
