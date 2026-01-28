import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { taskSchema } from "@/lib/validations/task";
import { getResend } from "@/lib/resend";
import { buildTaskAssignmentHtml, buildTaskAssignmentText } from "@/lib/email-templates/task-assignment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      contact: true,
      endorsement: { include: { candidate: true } },
    },
  });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Fetch existing task to compare assignee
  const existingTask = await prisma.task.findUnique({ where: { id }, select: { assignedToId: true } });

  const task = await prisma.task.update({
    where: { id },
    data: parsed.data,
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Task",
    entityId: id,
    summary: `Updated task: ${task.title}`,
    userId: session!.user.id,
  });

  // Send email if assignee changed and it's a different user
  const assigneeChanged = existingTask?.assignedToId !== task.assignedToId;
  if (assigneeChanged && task.assignedToId && task.assignedToId !== session!.user.id && task.assignedTo?.email) {
    try {
      const assigner = await prisma.user.findUnique({ where: { id: session!.user.id }, select: { name: true } });
      await getResend().emails.send({
        from: "UFW CRM <info@bigperro.dev>",
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

  return NextResponse.json(task);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "Task",
    entityId: id,
    summary: `Deleted task: ${existing.title}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
