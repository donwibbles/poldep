import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { electionSchema } from "@/lib/validations/election";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const election = await prisma.election.findUnique({
    where: { id },
    include: {
      races: {
        include: {
          candidates: { include: { contact: true } },
          endorsements: { include: { candidate: true, currentStage: true } },
        },
        orderBy: { office: "asc" },
      },
    },
  });

  if (!election) {
    return NextResponse.json({ error: "Election not found" }, { status: 404 });
  }

  return NextResponse.json(election);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = electionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const election = await prisma.election.update({ where: { id }, data: parsed.data });

  await logActivity({
    action: "UPDATE",
    entityType: "Election",
    entityId: id,
    summary: `Updated election: ${election.name}`,
    userId: session!.user.id,
  });

  return NextResponse.json(election);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.election.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Election not found" }, { status: 404 });
  }

  await prisma.election.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "Election",
    entityId: id,
    summary: `Deleted election: ${existing.name}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
