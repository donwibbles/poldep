import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const responseSchema = z.object({
  questionnaireId: z.string(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  submit: z.boolean().optional().default(false),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const endorsement = await prisma.endorsement.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!endorsement) {
    return NextResponse.json({ error: "Endorsement not found" }, { status: 404 });
  }

  const responses = await prisma.questionnaireResponse.findMany({
    where: { endorsementId: id },
    include: {
      questionnaire: {
        include: {
          questions: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  // Get available questionnaires that haven't been started yet
  const answeredQuestionnaires = responses.map((r) => r.questionnaireId);
  const availableQuestionnaires = await prisma.questionnaire.findMany({
    where: {
      isActive: true,
      id: { notIn: answeredQuestionnaires },
    },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json({ responses, availableQuestionnaires });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;
  const { id } = await params;

  const body = await request.json();
  const parsed = responseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const endorsement = await prisma.endorsement.findUnique({
    where: { id },
    include: { candidate: true },
  });

  if (!endorsement) {
    return NextResponse.json({ error: "Endorsement not found" }, { status: 404 });
  }

  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id: parsed.data.questionnaireId },
    include: { questions: true },
  });

  if (!questionnaire) {
    return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 });
  }

  // Validate required questions if submitting
  if (parsed.data.submit) {
    const requiredQuestions = questionnaire.questions.filter((q) => q.required);
    for (const question of requiredQuestions) {
      const answer = parsed.data.answers[question.id];
      if (!answer || (Array.isArray(answer) && answer.length === 0) || answer === "") {
        return NextResponse.json(
          { error: `Question "${question.text}" is required` },
          { status: 400 }
        );
      }
    }
  }

  // Upsert the response
  const response = await prisma.questionnaireResponse.upsert({
    where: {
      questionnaireId_endorsementId: {
        questionnaireId: parsed.data.questionnaireId,
        endorsementId: id,
      },
    },
    create: {
      questionnaireId: parsed.data.questionnaireId,
      endorsementId: id,
      answers: parsed.data.answers,
      submittedAt: parsed.data.submit ? new Date() : null,
    },
    update: {
      answers: parsed.data.answers,
      submittedAt: parsed.data.submit ? new Date() : undefined,
    },
    include: {
      questionnaire: {
        include: { questions: { orderBy: { order: "asc" } } },
      },
    },
  });

  await logActivity({
    action: parsed.data.submit ? "SUBMIT" : "UPDATE",
    entityType: "QuestionnaireResponse",
    entityId: response.id,
    summary: `${parsed.data.submit ? "Submitted" : "Updated"} questionnaire "${questionnaire.name}" for ${endorsement.candidate.firstName} ${endorsement.candidate.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json(response, { status: 201 });
}
