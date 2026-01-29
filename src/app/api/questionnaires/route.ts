import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi, requireAdminApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["TEXT", "TEXTAREA", "SINGLE_CHOICE", "MULTI_CHOICE"]),
  options: z.array(z.string()).optional().default([]),
  required: z.boolean().optional().default(false),
  order: z.number().int().min(0),
});

const questionnaireSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  stageId: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  questions: z.array(questionSchema).optional().default([]),
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const includeInactive = searchParams.get("includeInactive") === "true";

  const where: any = {};
  if (!includeInactive) {
    where.isActive = true;
  }

  const questionnaires = await prisma.questionnaire.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      stage: { select: { id: true, name: true } },
      _count: {
        select: {
          questions: true,
          responses: true,
        },
      },
    },
  });

  return NextResponse.json({ questionnaires });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json();
  const parsed = questionnaireSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { questions, ...data } = parsed.data;

  const questionnaire = await prisma.questionnaire.create({
    data: {
      ...data,
      questions: {
        create: questions,
      },
    },
    include: {
      questions: { orderBy: { order: "asc" } },
      stage: { select: { id: true, name: true } },
    },
  });

  await logActivity({
    action: "CREATE",
    entityType: "Questionnaire",
    entityId: questionnaire.id,
    summary: `Created questionnaire: ${questionnaire.name}`,
    userId: session!.user.id,
  });

  return NextResponse.json(questionnaire, { status: 201 });
}
