import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { raceSchema, raceCandidateSchema } from "@/lib/validations/election";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const race = await prisma.race.findUnique({
    where: { id },
    include: {
      election: true,
      candidates: { include: { contact: true } },
      endorsements: { include: { candidate: true, currentStage: true } },
    },
  });

  if (!race) return NextResponse.json({ error: "Race not found" }, { status: 404 });
  return NextResponse.json(race);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();

  // Handle adding/removing candidates
  if (body.addCandidate) {
    const parsed = raceCandidateSchema.safeParse(body.addCandidate);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    await prisma.raceCandidate.create({
      data: { raceId: id, ...parsed.data },
    });
    await logActivity({
      action: "ADD_CANDIDATE",
      entityType: "Race",
      entityId: id,
      summary: `Added candidate to race`,
      userId: session!.user.id,
    });
    const updated = await prisma.race.findUnique({
      where: { id },
      include: { candidates: { include: { contact: true } }, election: true },
    });
    return NextResponse.json(updated);
  }

  if (body.removeCandidate) {
    await prisma.raceCandidate.delete({
      where: { raceId_contactId: { raceId: id, contactId: body.removeCandidate } },
    });
    await logActivity({
      action: "REMOVE_CANDIDATE",
      entityType: "Race",
      entityId: id,
      summary: `Removed candidate from race`,
      userId: session!.user.id,
    });
    const updated = await prisma.race.findUnique({
      where: { id },
      include: { candidates: { include: { contact: true } }, election: true },
    });
    return NextResponse.json(updated);
  }

  const parsed = raceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const race = await prisma.race.update({ where: { id }, data: parsed.data });

  await logActivity({
    action: "UPDATE",
    entityType: "Race",
    entityId: id,
    summary: `Updated race: ${race.office}`,
    userId: session!.user.id,
  });

  return NextResponse.json(race);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.race.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Race not found" }, { status: 404 });

  await prisma.race.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "Race",
    entityId: id,
    summary: `Deleted race: ${existing.office}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
