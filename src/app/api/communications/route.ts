import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { communicationSchema } from "@/lib/validations/communication";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "";
  const contactId = searchParams.get("contactId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
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

  const { contactIds, ...data } = parsed.data;

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

  return NextResponse.json(communication, { status: 201 });
}
