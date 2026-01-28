import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { campaignUpdateSchema } from "@/lib/validations/campaign";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      template: true,
      sequenceSteps: {
        include: { template: true },
        orderBy: { stepOrder: "asc" },
      },
      _count: {
        select: {
          recipients: true,
          emailEvents: true,
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = campaignUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Only allow editing drafts
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft campaigns can be edited" },
      { status: 400 }
    );
  }

  // If template changed, update subject/body from template
  let updateData: any = { ...parsed.data };
  if (
    parsed.data.templateId &&
    parsed.data.templateId !== existing.templateId
  ) {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: parsed.data.templateId },
    });
    if (template) {
      if (!parsed.data.subject) updateData.subject = template.subject;
      if (!parsed.data.body) updateData.body = template.body;
    }
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: updateData,
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Campaign",
    entityId: campaign.id,
    summary: `Updated campaign "${campaign.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json(campaign);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Only allow deleting drafts
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft campaigns can be deleted" },
      { status: 400 }
    );
  }

  await prisma.campaign.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "Campaign",
    entityId: id,
    summary: `Deleted campaign "${existing.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
