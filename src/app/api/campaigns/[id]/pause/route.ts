import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";

export async function POST(
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

  if (campaign.status !== "SENDING") {
    return NextResponse.json(
      { error: "Only sending campaigns can be paused" },
      { status: 400 }
    );
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: "PAUSED" },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Campaign",
    entityId: id,
    summary: `Paused campaign "${campaign.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
