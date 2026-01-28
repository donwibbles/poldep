import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { raceSchema } from "@/lib/validations/election";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const electionId = searchParams.get("electionId") || "";

  const where: any = {};
  if (electionId) where.electionId = electionId;

  const races = await prisma.race.findMany({
    where,
    include: {
      election: true,
      candidates: { include: { contact: true } },
      _count: { select: { endorsements: true } },
    },
    orderBy: { office: "asc" },
  });

  return NextResponse.json({ races });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = raceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const race = await prisma.race.create({
    data: parsed.data,
    include: { election: true },
  });

  await logActivity({
    action: "CREATE",
    entityType: "Race",
    entityId: race.id,
    summary: `Created race: ${race.office}${race.district ? ` - ${race.district}` : ""}`,
    userId: session!.user.id,
  });

  return NextResponse.json(race, { status: 201 });
}
