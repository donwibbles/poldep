import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { contactSchema } from "@/lib/validations/contact";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const tag = searchParams.get("tag") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const where: any = {};

  if (type) {
    where.type = type;
  }

  if (tag) {
    where.tags = { has: tag };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { organization: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            communications: true,
            endorsements: true,
            parentAssignments: true,
          },
        },
        staffAssignments: {
          where: { endDate: null },
          take: 1,
          include: { parentContact: { select: { id: true, firstName: true, lastName: true } } },
        },
        positionAssignments: {
          where: { endDate: null },
          take: 1,
          orderBy: { startDate: "desc" },
        },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({
    contacts,
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
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: parsed.data,
  });

  await logActivity({
    action: "CREATE",
    entityType: "Contact",
    entityId: contact.id,
    summary: `Created contact ${contact.firstName} ${contact.lastName}`,
    userId: session!.user.id,
  });

  return NextResponse.json(contact, { status: 201 });
}
