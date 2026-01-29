import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi, requireAdminApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["TEXT", "TEXTAREA", "SINGLE_CHOICE", "MULTI_CHOICE"]),
  options: z.array(z.string()).optional().default([]),
  required: z.boolean().optional().default(false),
  order: z.number().int().min(0),
});

const updateQuestionnaireSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).optional(),
  stageId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  questions: z.array(questionSchema).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      stage: { select: { id: true, name: true } },
      _count: {
        select: { responses: true },
      },
    },
  });

  if (!questionnaire) {
    return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
  }

  return NextResponse.json(questionnaire);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = updateQuestionnaireSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.questionnaire.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
  }

  const { questions, ...data } = parsed.data;

  // Update in transaction
  const questionnaire = await prisma.$transaction(async (tx) => {
    // Update questionnaire data
    await tx.questionnaire.update({
      where: { id },
      data,
    });

    // If questions provided, replace all questions
    if (questions) {
      // Delete existing questions
      await tx.question.deleteMany({ where: { questionnaireId: id } });

      // Create new questions
      await tx.question.createMany({
        data: questions.map((q) => ({
          questionnaireId: id,
          text: q.text,
          type: q.type,
          options: q.options || [],
          required: q.required || false,
          order: q.order,
        })),
      });
    }

    return tx.questionnaire.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: "asc" } },
        stage: { select: { id: true, name: true } },
      },
    });
  });

  await logActivity({
    action: "UPDATE",
    entityType: "Questionnaire",
    entityId: id,
    summary: `Updated questionnaire: ${questionnaire?.name}`,
    userId: session!.user.id,
  });

  return NextResponse.json(questionnaire);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.questionnaire.findUnique({
    where: { id },
    include: { _count: { select: { responses: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
  }

  if (existing._count.responses > 0) {
    // Soft delete by deactivating
    await prisma.questionnaire.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity({
      action: "UPDATE",
      entityType: "Questionnaire",
      entityId: id,
      summary: `Deactivated questionnaire: ${existing.name} (has ${existing._count.responses} responses)`,
      userId: session!.user.id,
    });

    return NextResponse.json({ success: true, deactivated: true });
  }

  await prisma.questionnaire.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "Questionnaire",
    entityId: id,
    summary: `Deleted questionnaire: ${existing.name}`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
