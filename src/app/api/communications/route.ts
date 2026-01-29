import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { communicationSchema, TRACKABLE_COMM_TYPES } from "@/lib/validations/communication";
import { getResend } from "@/lib/resend";
import { buildTaskAssignmentHtml, buildTaskAssignmentText } from "@/lib/email-templates/task-assignment";
import { EMAIL_FROM } from "@/lib/email-config";

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

  const { contactIds, createFollowUpTask, assignTaskToId, responseStatus, initiativeId, ...data } = parsed.data;

  // Determine appropriate responseStatus based on communication type
  // For trackable types (email, phone, etc.) default to AWAITING
  // For non-trackable types (meetings, events) default to NOT_APPLICABLE
  const isTrackable = (TRACKABLE_COMM_TYPES as readonly string[]).includes(data.type);
  const effectiveResponseStatus = responseStatus || (isTrackable ? "AWAITING" : "NOT_APPLICABLE");

  const communication = await prisma.communication.create({
    data: {
      ...data,
      initiativeId: initiativeId || null,
      responseStatus: effectiveResponseStatus,
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

  // Update initiative target stats if communication is linked to an initiative
  if (initiativeId) {
    await updateInitiativeTargetStats(initiativeId, contactIds, communication.date);
  }

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
  }

  return NextResponse.json(communication, { status: 201 });
}

/**
 * Update initiative target stats when a communication is logged.
 * Handles staff roll-up: if a staff member is contacted, also update the boss's target.
 */
async function updateInitiativeTargetStats(
  initiativeId: string,
  contactIds: string[],
  communicationDate: Date
) {
  // Get the initiative's targets
  const targets = await prisma.initiativeTarget.findMany({
    where: { initiativeId },
    select: { id: true, contactId: true },
  });
  const targetContactIds = new Set(targets.map((t) => t.contactId));

  // Find staff assignments: if any contacted contact is staff of a target, include the target
  const staffAssignments = await prisma.staffAssignment.findMany({
    where: {
      staffContactId: { in: contactIds },
      parentContactId: { in: Array.from(targetContactIds) },
      endDate: null,
    },
    select: { parentContactId: true },
  });

  // Combine direct contacts and staff roll-ups
  const affectedTargetContactIds = new Set<string>();

  // Direct contacts who are targets
  for (const contactId of contactIds) {
    if (targetContactIds.has(contactId)) {
      affectedTargetContactIds.add(contactId);
    }
  }

  // Staff contacts roll up to their boss
  for (const assignment of staffAssignments) {
    affectedTargetContactIds.add(assignment.parentContactId);
  }

  // Update each affected target
  for (const contactId of affectedTargetContactIds) {
    const target = targets.find((t) => t.contactId === contactId);
    if (!target) continue;

    await prisma.initiativeTarget.update({
      where: { id: target.id },
      data: {
        touchCount: { increment: 1 },
        lastContactDate: communicationDate,
        firstContactDate: {
          set: await prisma.initiativeTarget
            .findUnique({ where: { id: target.id }, select: { firstContactDate: true } })
            .then((t) => t?.firstContactDate || communicationDate),
        },
        responseStatus: {
          set: await prisma.initiativeTarget
            .findUnique({ where: { id: target.id }, select: { responseStatus: true } })
            .then((t) =>
              t?.responseStatus === "NOT_CONTACTED" ? "AWAITING_RESPONSE" : t?.responseStatus || "AWAITING_RESPONSE"
            ),
        },
      },
    });
  }
}
