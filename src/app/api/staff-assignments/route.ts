import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { createStaffAssignmentSchema } from "@/lib/validations/staff-assignment";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const contactId = searchParams.get("contactId");

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  const [staffAssignments, parentAssignments] = await Promise.all([
    prisma.staffAssignment.findMany({
      where: { staffContactId: contactId },
      include: { parentContact: { select: { id: true, firstName: true, lastName: true, type: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.staffAssignment.findMany({
      where: { parentContactId: contactId },
      include: { staffContact: { select: { id: true, firstName: true, lastName: true, type: true } } },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return NextResponse.json({ staffAssignments, parentAssignments });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = createStaffAssignmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { staffContactId, parentContactId, startDate, notes } = parsed.data;

  if (staffContactId === parentContactId) {
    return NextResponse.json({ error: "A contact cannot be assigned to itself" }, { status: 400 });
  }

  const assignment = await prisma.staffAssignment.create({
    data: {
      staffContactId,
      parentContactId,
      startDate: startDate || new Date(),
      notes,
    },
    include: {
      staffContact: { select: { id: true, firstName: true, lastName: true } },
      parentContact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await logActivity({
    action: "CREATE",
    entityType: "StaffAssignment",
    entityId: assignment.id,
    summary: `Assigned ${assignment.staffContact.firstName} ${assignment.staffContact.lastName} to ${assignment.parentContact.firstName} ${assignment.parentContact.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json(assignment, { status: 201 });
}
