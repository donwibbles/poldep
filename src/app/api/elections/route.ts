import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { electionSchema } from "@/lib/validations/election";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const [elections, total] = await Promise.all([
    prisma.election.findMany({
      orderBy: { date: "desc" },
      skip,
      take: limit,
      include: {
        _count: { select: { races: true } },
      },
    }),
    prisma.election.count(),
  ]);

  return NextResponse.json({
    elections,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = electionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const election = await prisma.election.create({ data: parsed.data });

  await logActivity({
    action: "CREATE",
    entityType: "Election",
    entityId: election.id,
    summary: `Created election: ${election.name}`,
    userId: session!.user.id,
  });

  return NextResponse.json(election, { status: 201 });
}
