import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { z } from "zod";

const responseSchema = z.object({
  responseStatus: z.enum(["AWAITING", "RESPONDED", "NO_RESPONSE", "NOT_APPLICABLE"]),
  responseDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
  responseNotes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const communication = await prisma.communication.findUnique({
    where: { id },
  });

  if (!communication) {
    return NextResponse.json({ error: "Communication not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = responseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { responseStatus, responseDate, responseNotes } = parsed.data;

  const updated = await prisma.communication.update({
    where: { id },
    data: {
      responseStatus,
      responseDate: responseStatus === "RESPONDED" ? (responseDate || new Date()) : null,
      responseNotes,
    },
  });

  return NextResponse.json(updated);
}
