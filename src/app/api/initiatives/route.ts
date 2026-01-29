import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { initiativeSchema } from "@/lib/validations/initiative";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const MAX_LIMIT = 100;
  const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "25"), 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const [initiatives, total] = await Promise.all([
    prisma.outreachInitiative.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: { targets: true, communications: true },
        },
        targets: {
          select: {
            responseStatus: true,
            lastContactDate: true,
          },
        },
      },
    }),
    prisma.outreachInitiative.count({ where }),
  ]);

  // Calculate response stats for each initiative
  const initiativesWithStats = initiatives.map((initiative) => {
    const targetCount = initiative._count.targets;
    const respondedCount = initiative.targets.filter((t) =>
      ["RESPONDED_POSITIVE", "RESPONDED_NEGATIVE", "RESPONDED_NEUTRAL"].includes(
        t.responseStatus
      )
    ).length;
    const lastActivity = initiative.targets.reduce(
      (latest, t) =>
        t.lastContactDate && (!latest || t.lastContactDate > latest)
          ? t.lastContactDate
          : latest,
      null as Date | null
    );

    const { targets, ...rest } = initiative;
    return {
      ...rest,
      targetCount,
      respondedCount,
      responseRate:
        targetCount > 0 ? Math.round((respondedCount / targetCount) * 100) : 0,
      lastActivity,
    };
  });

  return NextResponse.json({
    initiatives: initiativesWithStats,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = initiativeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const initiative = await prisma.outreachInitiative.create({
    data: {
      ...parsed.data,
      createdById: session!.user.id,
    },
  });

  await logActivity({
    action: "CREATE",
    entityType: "OutreachInitiative",
    entityId: initiative.id,
    summary: `Created initiative "${initiative.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json(initiative, { status: 201 });
}
