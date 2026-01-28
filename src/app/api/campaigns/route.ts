import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { campaignSchema } from "@/lib/validations/campaign";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        template: {
          select: { id: true, name: true },
        },
        _count: {
          select: { recipients: true },
        },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  return NextResponse.json({
    campaigns,
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
  const parsed = campaignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // If a template is selected, get its subject and body as defaults
  let subject = parsed.data.subject;
  let campaignBody = parsed.data.body;

  if (parsed.data.templateId) {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: parsed.data.templateId },
    });
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 400 }
      );
    }
    // Only use template values if not overridden
    if (!subject) subject = template.subject;
    if (!campaignBody) campaignBody = template.body;
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      templateId: parsed.data.templateId,
      subject,
      body: campaignBody,
      scheduledAt: parsed.data.scheduledAt,
      createdById: session!.user.id,
    },
  });

  await logActivity({
    action: "CREATE",
    entityType: "Campaign",
    entityId: campaign.id,
    summary: `Created campaign "${campaign.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json(campaign, { status: 201 });
}
