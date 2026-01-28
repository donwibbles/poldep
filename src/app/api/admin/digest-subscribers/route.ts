import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth-helpers";
import { createDigestSubscriberSchema } from "@/lib/validations/digest-subscriber";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  // Get external subscribers
  const externalSubscribers = await prisma.digestSubscriber.findMany({
    orderBy: { name: "asc" },
  });

  // Get user subscribers (from DigestPreference)
  const userSubscribers = await prisma.digestPreference.findMany({
    where: { frequency: { not: "NONE" } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  // Combine into unified list
  const subscribers = [
    ...userSubscribers.map((pref) => ({
      id: pref.id,
      email: pref.user.email,
      name: pref.user.name,
      frequency: pref.frequency,
      isActive: true,
      source: "user" as const,
      userId: pref.userId,
    })),
    ...externalSubscribers.map((sub) => ({
      id: sub.id,
      email: sub.email,
      name: sub.name,
      frequency: sub.frequency,
      isActive: sub.isActive,
      source: "external" as const,
      userId: null,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ subscribers });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json();
  const parsed = createDigestSubscriberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  // Check if email already exists as external subscriber
  const existingExternal = await prisma.digestSubscriber.findUnique({
    where: { email: parsed.data.email },
  });
  if (existingExternal) {
    return NextResponse.json({ error: "A subscriber with this email already exists" }, { status: 400 });
  }

  // Check if email belongs to a user (they should manage their own preferences)
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existingUser) {
    return NextResponse.json({ error: "This email belongs to a registered user. They can manage their own digest preferences." }, { status: 400 });
  }

  const subscriber = await prisma.digestSubscriber.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      frequency: parsed.data.frequency,
    },
  });

  return NextResponse.json(subscriber, { status: 201 });
}
