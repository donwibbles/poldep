import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { sendCampaign } from "@/lib/campaign-sender";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      _count: { select: { recipients: true } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Only allow sending drafts or scheduled campaigns
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    return NextResponse.json(
      { error: "Campaign has already been sent or is currently sending" },
      { status: 400 }
    );
  }

  if (campaign._count.recipients === 0) {
    return NextResponse.json(
      { error: "Campaign has no recipients" },
      { status: 400 }
    );
  }

  if (!campaign.subject || !campaign.body) {
    return NextResponse.json(
      { error: "Campaign subject and body are required" },
      { status: 400 }
    );
  }

  // Check if scheduled for the future
  if (campaign.scheduledAt && new Date(campaign.scheduledAt) > new Date()) {
    // Just mark as scheduled, don't send yet
    await prisma.campaign.update({
      where: { id },
      data: { status: "SCHEDULED" },
    });

    await logActivity({
      action: "UPDATE",
      entityType: "Campaign",
      entityId: id,
      summary: `Scheduled campaign "${campaign.name}"`,
      userId: session!.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Campaign scheduled",
      scheduledAt: campaign.scheduledAt,
    });
  }

  // Send immediately
  const result = await sendCampaign(id);

  await logActivity({
    action: "UPDATE",
    entityType: "Campaign",
    entityId: id,
    summary: `Sent campaign "${campaign.name}" to ${result.sent} recipients`,
    metadata: { sent: result.sent, failed: result.failed },
    userId: session!.user.id,
  });

  if (result.success) {
    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    });
  } else {
    return NextResponse.json(
      {
        success: false,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      },
      { status: 207 } // Multi-Status for partial success
    );
  }
}
