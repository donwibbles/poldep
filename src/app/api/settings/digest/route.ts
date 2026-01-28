import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { digestPreferenceSchema } from "@/lib/validations/digest";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const pref = await prisma.digestPreference.findUnique({
    where: { userId: session!.user.id },
  });

  return NextResponse.json({ frequency: pref?.frequency || "NONE" });
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = digestPreferenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.digestPreference.upsert({
    where: { userId: session!.user.id },
    update: { frequency: parsed.data.frequency },
    create: { userId: session!.user.id, frequency: parsed.data.frequency },
  });

  return NextResponse.json({ success: true });
}
