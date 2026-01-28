import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { sequenceStepSchema } from "@/lib/validations/campaign";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const steps = await prisma.sequenceStep.findMany({
    where: { campaignId: id },
    include: { template: true },
    orderBy: { stepOrder: "asc" },
  });

  return NextResponse.json({ steps });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = sequenceStepSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.type !== "DRIP_SEQUENCE") {
    return NextResponse.json(
      { error: "Steps can only be added to drip sequence campaigns" },
      { status: 400 }
    );
  }

  if (campaign.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Steps can only be added to draft campaigns" },
      { status: 400 }
    );
  }

  // Verify template exists
  const template = await prisma.emailTemplate.findUnique({
    where: { id: parsed.data.templateId },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 400 });
  }

  // Get next step order if not provided
  let stepOrder = parsed.data.stepOrder;
  if (stepOrder === undefined) {
    const lastStep = await prisma.sequenceStep.findFirst({
      where: { campaignId: id },
      orderBy: { stepOrder: "desc" },
    });
    stepOrder = lastStep ? lastStep.stepOrder + 1 : 0;
  }

  const step = await prisma.sequenceStep.create({
    data: {
      campaignId: id,
      templateId: parsed.data.templateId,
      subject: parsed.data.subject,
      body: parsed.data.body,
      delayDays: parsed.data.delayDays,
      stepOrder,
    },
    include: { template: true },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Campaign",
    entityId: id,
    summary: `Added step ${stepOrder + 1} to campaign "${campaign.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json(step, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const { stepId } = await request.json();

  if (!stepId) {
    return NextResponse.json({ error: "stepId is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Steps can only be removed from draft campaigns" },
      { status: 400 }
    );
  }

  const step = await prisma.sequenceStep.findUnique({
    where: { id: stepId },
  });

  if (!step || step.campaignId !== id) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  await prisma.sequenceStep.delete({ where: { id: stepId } });

  // Reorder remaining steps
  await prisma.$executeRaw`
    UPDATE "SequenceStep"
    SET "stepOrder" = "stepOrder" - 1
    WHERE "campaignId" = ${id} AND "stepOrder" > ${step.stepOrder}
  `;

  await logActivity({
    action: "UPDATE",
    entityType: "Campaign",
    entityId: id,
    summary: `Removed step from campaign "${campaign.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
