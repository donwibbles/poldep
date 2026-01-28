import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { emailTemplateSchema } from "@/lib/validations/email-template";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ];
  }

  const [templates, total] = await Promise.all([
    prisma.emailTemplate.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      skip,
      take: limit,
    }),
    prisma.emailTemplate.count({ where }),
  ]);

  return NextResponse.json({
    templates,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = emailTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // If this template is being set as default, unset any existing default
  if (parsed.data.isDefault) {
    await prisma.emailTemplate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.emailTemplate.create({
    data: parsed.data,
  });

  await logActivity({
    action: "CREATE",
    entityType: "EmailTemplate",
    entityId: template.id,
    summary: `Created email template "${template.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json(template, { status: 201 });
}
