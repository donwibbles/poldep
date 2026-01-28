import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendCampaign, sendDripStep } from "@/lib/campaign-sender";

export async function POST(request: NextRequest) {
  // Bearer token auth - use separate CRON_SECRET for campaign cron jobs
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = {
    scheduledCampaigns: { processed: 0, sent: 0, failed: 0 },
    dripSteps: { processed: 0, sent: 0, failed: 0 },
  };

  // 1. Process scheduled campaigns (ONE_TIME campaigns with scheduledAt <= now)
  const scheduledCampaigns = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      type: "ONE_TIME",
      scheduledAt: { lte: now },
    },
  });

  for (const campaign of scheduledCampaigns) {
    results.scheduledCampaigns.processed++;
    try {
      const sendResult = await sendCampaign(campaign.id);
      if (sendResult.success) {
        results.scheduledCampaigns.sent++;
      } else {
        results.scheduledCampaigns.failed++;
      }
    } catch (error) {
      console.error(`Failed to send scheduled campaign ${campaign.id}:`, error);
      results.scheduledCampaigns.failed++;
    }
  }

  // 2. Process drip sequence steps
  // Find recipients where nextSendAt <= now and campaign is SENDING (not PAUSED)
  const dripRecipients = await prisma.campaignRecipient.findMany({
    where: {
      nextSendAt: { lte: now },
      campaign: {
        type: "DRIP_SEQUENCE",
        status: "SENDING",
      },
    },
    include: {
      campaign: {
        include: {
          sequenceSteps: {
            orderBy: { stepOrder: "asc" },
          },
        },
      },
    },
    take: 100, // Process in batches to avoid timeouts
  });

  for (const recipient of dripRecipients) {
    results.dripSteps.processed++;

    // Find the step to send (currentStep is 0-indexed, so we need the step at currentStep)
    const currentStepOrder = recipient.currentStep;
    const step = recipient.campaign.sequenceSteps.find(
      (s) => s.stepOrder === currentStepOrder
    );

    if (!step) {
      // No more steps - this recipient has completed the sequence
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { nextSendAt: null },
      });
      continue;
    }

    try {
      const sendResult = await sendDripStep(
        recipient.campaignId,
        recipient.id,
        currentStepOrder
      );

      if (sendResult.success) {
        results.dripSteps.sent++;
      } else {
        results.dripSteps.failed++;
        console.error(
          `Failed to send drip step for recipient ${recipient.id}:`,
          sendResult.error
        );
      }
    } catch (error) {
      results.dripSteps.failed++;
      console.error(`Error sending drip step for recipient ${recipient.id}:`, error);
    }
  }

  // 3. Check if any drip sequences are complete
  // A drip sequence is complete when all recipients have no nextSendAt
  const activeDripCampaigns = await prisma.campaign.findMany({
    where: {
      type: "DRIP_SEQUENCE",
      status: "SENDING",
    },
    include: {
      _count: {
        select: {
          recipients: true,
        },
      },
    },
  });

  for (const campaign of activeDripCampaigns) {
    const pendingRecipients = await prisma.campaignRecipient.count({
      where: {
        campaignId: campaign.id,
        nextSendAt: { not: null },
      },
    });

    if (pendingRecipients === 0) {
      // All recipients have completed the sequence
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "SENT" },
      });
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    results,
  });
}

// Also support GET for health checks
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/cron/campaigns",
    description: "Processes scheduled campaigns and drip sequence steps",
  });
}
