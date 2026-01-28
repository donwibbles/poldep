import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { positionAssignmentSchema } from "@/lib/validations/position-assignment";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const contactId = searchParams.get("contactId");

  const where: any = {};
  if (contactId) where.contactId = contactId;

  const assignments = await prisma.positionAssignment.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ assignments });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = positionAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const assignment = await prisma.positionAssignment.create({
    data: parsed.data,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await logActivity({
    action: "CREATE",
    entityType: "PositionAssignment",
    entityId: assignment.id,
    summary: `Added position "${assignment.positionTitle}" to ${assignment.contact.firstName} ${assignment.contact.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json(assignment, { status: 201 });
}
