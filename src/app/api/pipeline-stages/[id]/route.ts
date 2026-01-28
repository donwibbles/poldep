import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { pipelineStageSchema } from "@/lib/validations/pipeline";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = pipelineStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const stage = await prisma.pipelineStage.update({ where: { id }, data: parsed.data });

  await logActivity({
    action: "UPDATE",
    entityType: "PipelineStage",
    entityId: id,
    summary: `Updated pipeline stage: ${stage.name}`,
    userId: session!.user.id,
  });

  return NextResponse.json(stage);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  // Block deletion if any endorsement is at this stage
  const count = await prisma.endorsement.count({ where: { currentStageId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete stage: ${count} endorsement(s) are currently at this stage.` },
      { status: 409 }
    );
  }

  const stage = await prisma.pipelineStage.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "PipelineStage",
    entityId: id,
    summary: `Deleted pipeline stage: ${stage.name}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
