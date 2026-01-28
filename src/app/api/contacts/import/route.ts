import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { importRowSchema } from "@/lib/validations/import";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const rows: unknown[] = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  if (rows.length > 1000) {
    return NextResponse.json({ error: "Maximum 1000 rows per batch" }, { status: 400 });
  }

  const valid: any[] = [];
  const errors: { row: number; errors: string[] }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = importRowSchema.safeParse(rows[i]);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const messages = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}: ${(errs as string[]).join(", ")}`)
        .slice(0, 5);
      errors.push({ row: i, errors: messages });
    }
  }

  let created = 0;
  if (valid.length > 0) {
    const result = await prisma.contact.createMany({
      data: valid,
      skipDuplicates: true,
    });
    created = result.count;

    await logActivity({
      action: "IMPORT",
      entityType: "Contact",
      entityId: "bulk",
      summary: `Imported ${created} contacts from CSV`,
      metadata: { created, skipped: valid.length - created, errorCount: errors.length },
      userId: session!.user.id,
    });
  }

  return NextResponse.json({
    created,
    skipped: valid.length - created,
    errors,
  });
}
