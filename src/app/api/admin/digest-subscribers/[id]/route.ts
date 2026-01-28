import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth-helpers";
import { updateDigestSubscriberSchema } from "@/lib/validations/digest-subscriber";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateDigestSubscriberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.digestSubscriber.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  const subscriber = await prisma.digestSubscriber.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(subscriber);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.digestSubscriber.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  await prisma.digestSubscriber.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
