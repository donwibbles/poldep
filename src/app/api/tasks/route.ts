import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { taskSchema } from "@/lib/validations/task";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || "";
  const assignedToId = searchParams.get("assignedToId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      skip,
      take: limit,
      include: {
        assignedTo: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        endorsement: {
          select: { id: true, candidate: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({
    tasks,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: parsed.data,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  await logActivity({
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    summary: `Created task: ${task.title}`,
    userId: session!.user.id,
  });

  return NextResponse.json(task, { status: 201 });
}
