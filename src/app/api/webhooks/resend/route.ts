import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Webhook } from "svix";

// Resend uses Svix for webhook delivery
// Set RESEND_WEBHOOK_SECRET in your environment variables

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    to: string[];
    from: string;
    subject: string;
    click?: {
      link: string;
      timestamp: string;
    };
  };
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  // Require webhook secret in production
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("RESEND_WEBHOOK_SECRET is required in production");
      return NextResponse.json(
        { error: "Webhook verification not configured" },
        { status: 500 }
      );
    }
    console.warn("RESEND_WEBHOOK_SECRET not configured - skipping verification (development only)");
  }

  const body = await request.text();

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing webhook headers" },
        { status: 400 }
      );
    }

    try {
      const wh = new Webhook(webhookSecret);
      wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  // Find the recipient by resend ID
  const recipient = await prisma.campaignRecipient.findFirst({
    where: { resendId: emailId },
  });

  if (!recipient) {
    // Email not from a campaign, ignore
    return NextResponse.json({ success: true, message: "Not a campaign email" });
  }

  // Map Resend event types to our event types
  const eventTypeMap: Record<string, string> = {
    "email.sent": "delivered",
    "email.delivered": "delivered",
    "email.opened": "opened",
    "email.clicked": "clicked",
    "email.bounced": "bounced",
    "email.complained": "complained",
  };

  const eventType = eventTypeMap[event.type];
  if (!eventType) {
    // Unknown event type, ignore
    return NextResponse.json({ success: true, message: "Unknown event type" });
  }

  // Create email event record
  await prisma.emailEvent.create({
    data: {
      campaignId: recipient.campaignId,
      resendId: emailId,
      eventType,
      metadata: event.data.click ? { link: event.data.click.link } : undefined,
    },
  });

  // Update recipient status
  const now = new Date();
  const recipientUpdate: any = {};
  const campaignUpdate: any = {};

  switch (eventType) {
    case "delivered":
      // No specific recipient field for delivered
      break;
    case "opened":
      if (!recipient.openedAt) {
        recipientUpdate.openedAt = now;
        campaignUpdate.totalOpened = { increment: 1 };
      }
      break;
    case "clicked":
      if (!recipient.clickedAt) {
        recipientUpdate.clickedAt = now;
        campaignUpdate.totalClicked = { increment: 1 };
      }
      break;
    case "bounced":
      if (!recipient.bouncedAt) {
        recipientUpdate.bouncedAt = now;
        campaignUpdate.totalBounced = { increment: 1 };
      }
      break;
    case "complained":
      // Treat complaints similar to bounces
      if (!recipient.bouncedAt) {
        recipientUpdate.bouncedAt = now;
        campaignUpdate.totalBounced = { increment: 1 };
      }
      break;
  }

  // Update in transaction
  if (Object.keys(recipientUpdate).length > 0 || Object.keys(campaignUpdate).length > 0) {
    await prisma.$transaction([
      ...(Object.keys(recipientUpdate).length > 0
        ? [prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: recipientUpdate,
          })]
        : []),
      ...(Object.keys(campaignUpdate).length > 0
        ? [prisma.campaign.update({
            where: { id: recipient.campaignId },
            data: campaignUpdate,
          })]
        : []),
    ]);
  }

  return NextResponse.json({ success: true });
}

// Handle reply webhooks (Resend Inbound Emails feature)
// This requires additional DNS configuration for reply tracking
export async function handleReply(emailId: string, campaignId: string, recipientId: string) {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
  });

  if (!recipient || recipient.repliedAt) {
    return;
  }

  await prisma.$transaction([
    prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { repliedAt: new Date() },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { totalReplied: { increment: 1 } },
    }),
    prisma.emailEvent.create({
      data: {
        campaignId,
        resendId: emailId,
        eventType: "replied",
      },
    }),
  ]);
}
