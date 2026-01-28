import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { communicationSchema } from "@/lib/validations/communication";
import { getResend } from "@/lib/resend";
import { buildTaskAssignmentHtml, buildTaskAssignmentText } from "@/lib/email-templates/task-assignment";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "";
  const contactId = searchParams.get("contactId") || "";
  const MAX_LIMIT = 100;
  const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25"), 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (type) where.type = type;
  if (contactId) {
    where.contacts = { some: { contactId } };
  }

  const [communications, total] = await Promise.all([
    prisma.communication.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
      include: {
        contacts: { include: { contact: { select: { id: true, firstName: true, lastName: true } } } },
        endorsement: { select: { id: true, candidate: { select: { firstName: true, lastName: true } } } },
        _count: { select: { attachments: true } },
      },
    }),
    prisma.communication.count({ where }),
  ]);

  return NextResponse.json({
    communications,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = communicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { contactIds, createFollowUpTask, assignTaskToId, ...data } = parsed.data;

  const communication = await prisma.communication.create({
    data: {
      ...data,
      contacts: {
        create: contactIds.map((contactId: string) => ({ contactId })),
      },
    },
    include: {
      contacts: { include: { contact: true } },
    },
  });

  await logActivity({
    action: "CREATE",
    entityType: "Communication",
    entityId: communication.id,
    summary: `Created ${communication.type.toLowerCase().replace(/_/g, " ")}: ${communication.subject}`,
    userId: session!.user.id,
  });

  // Create follow-up task if requested
  if (createFollowUpTask && communication.followUpDate) {
    const taskAssigneeId = assignTaskToId || session!.user.id;
    const firstContactId = contactIds[0] || null;

    const task = await prisma.task.create({
      data: {
        title: `Follow-up: ${communication.subject}`,
        dueDate: communication.followUpDate,
        contactId: firstContactId,
        assignedToId: taskAssigneeId,
      },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });

    await logActivity({
      action: "CREATE",
      entityType: "Task",
      entityId: task.id,
      summary: `Created follow-up task: ${task.title}`,
      userId: session!.user.id,
    });

    // Send email if assigned to someone else
    if (taskAssigneeId !== session!.user.id && task.assignedTo?.email) {
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
  }

  return NextResponse.json(communication, { status: 201 });
}
