import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { taskSchema } from "@/lib/validations/task";
import { getResend } from "@/lib/resend";
import { buildTaskAssignmentHtml, buildTaskAssignmentText } from "@/lib/email-templates/task-assignment";
import { EMAIL_FROM } from "@/lib/email-config";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || "";
  const assignedToId = searchParams.get("assignedToId") || "";
  const MAX_LIMIT = 100;
  const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25"), 1), MAX_LIMIT);
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
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  await logActivity({
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    summary: `Created task: ${task.title}`,
    userId: session!.user.id,
  });

  // Send email notification if task is assigned to someone other than creator
  if (task.assignedToId && task.assignedToId !== session!.user.id && task.assignedTo?.email) {
    try {
      const assigner = await prisma.user.findUnique({ where: { id: session!.user.id }, select: { name: true } });
      await getResend().emails.send({
        from: EMAIL_FROM,
        to: task.assignedTo.email,
        subject: `Task assigned: ${task.title}`,
        html: buildTaskAssignmentHtml({
          taskTitle: task.title,
          taskDescription: task.description,
          dueDate: task.dueDate,
          assignerName: assigner?.name || "Someone",
          assigneeName: task.assignedTo.name,
        }),
        text: buildTaskAssignmentText({
          taskTitle: task.title,
          taskDescription: task.description,
          dueDate: task.dueDate,
          assignerName: assigner?.name || "Someone",
          assigneeName: task.assignedTo.name,
        }),
      });
    } catch (err) {
      console.error("Failed to send task assignment email:", err);
    }
  }

  return NextResponse.json(task, { status: 201 });
}
