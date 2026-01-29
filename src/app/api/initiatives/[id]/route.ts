import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { initiativeUpdateSchema } from "@/lib/validations/initiative";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const initiative = await prisma.outreachInitiative.findUnique({
    where: { id },
    include: {
      targets: {
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              type: true,
              title: true,
              organization: true,
              email: true,
              phone: true,
              party: true,
              district: true,
            },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      },
      _count: {
        select: { communications: true },
      },
    },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
  }

  // Calculate stats
  const targetCount = initiative.targets.length;
  const respondedCount = initiative.targets.filter((t) =>
    ["RESPONDED_POSITIVE", "RESPONDED_NEGATIVE", "RESPONDED_NEUTRAL"].includes(
      t.responseStatus
    )
  ).length;
  const totalTouches = initiative.targets.reduce((sum, t) => sum + t.touchCount, 0);
  const avgTouches =
    targetCount > 0 ? Math.round((totalTouches / targetCount) * 10) / 10 : 0;

  return NextResponse.json({
    ...initiative,
    stats: {
      targetCount,
      respondedCount,
      responseRate:
        targetCount > 0 ? Math.round((respondedCount / targetCount) * 100) : 0,
      totalTouches,
      avgTouches,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = initiativeUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.outreachInitiative.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
  }

  const initiative = await prisma.outreachInitiative.update({
    where: { id },
    data: parsed.data,
  });

  await logActivity({
    action: "UPDATE",
    entityType: "OutreachInitiative",
    entityId: initiative.id,
    summary: `Updated initiative "${initiative.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json(initiative);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.outreachInitiative.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
  }

  await prisma.outreachInitiative.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "OutreachInitiative",
    entityId: id,
    summary: `Deleted initiative "${existing.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
