import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { contactSchema } from "@/lib/validations/contact";
import { OFFICE_LEVELS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const tag = searchParams.get("tag") || "";
  const state = searchParams.get("state") || "";
  const party = searchParams.get("party") || "";
  const officeLevel = searchParams.get("officeLevel") || "";
  const sortBy = searchParams.get("sortBy") || "name_asc";
  const MAX_LIMIT = 100;
  const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25"), 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (type) {
    where.type = type;
  }

  if (tag) {
    where.tags = { has: tag };
  }

  if (state) {
    where.state = state;
  }

  if (party) {
    where.party = party;
  }

  if (officeLevel) {
    // Filter by position titles that match the office level
    const positionTitles = OFFICE_LEVELS[officeLevel as keyof typeof OFFICE_LEVELS] || [];
    if (positionTitles.length > 0) {
      where.positionAssignments = {
        some: {
          positionTitle: { in: positionTitles as unknown as string[] },
          endDate: null,
        },
      };
    }
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { organization: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Build orderBy based on sortBy parameter
  let orderBy: any = [{ lastName: "asc" }, { firstName: "asc" }];
  switch (sortBy) {
    case "name_desc":
      orderBy = [{ lastName: "desc" }, { firstName: "desc" }];
      break;
    case "recent":
      orderBy = [{ createdAt: "desc" }];
      break;
    case "name_asc":
    default:
      orderBy = [{ lastName: "asc" }, { firstName: "asc" }];
      break;
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy,
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
