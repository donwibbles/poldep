import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { contactRatingSchema } from "@/lib/validations/contact-rating";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const ratings = await prisma.contactRatingHistory.findMany({
    where: { contactId: id },
    orderBy: { year: "desc" },
  });

  return NextResponse.json({ ratings });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  // Verify contact exists
  const contact = await prisma.contact.findUnique({
    where: { id },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = contactRatingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { year, rating, notes } = parsed.data;

  // Upsert the rating for this year
  const ratingRecord = await prisma.contactRatingHistory.upsert({
    where: {
      contactId_year: {
        contactId: id,
        year,
      },
    },
    create: {
      contactId: id,
      year,
      rating,
      notes,
    },
    update: {
      rating,
      notes,
    },
  });

  return NextResponse.json(ratingRecord, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || "");

  if (!year || isNaN(year)) {
    return NextResponse.json({ error: "Year is required" }, { status: 400 });
  }

  await prisma.contactRatingHistory.deleteMany({
    where: {
      contactId: id,
      year,
    },
  });

  return NextResponse.json({ success: true });
}
