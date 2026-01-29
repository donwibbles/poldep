import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const suppressionSchema = z.object({
  email: z.string().email("Valid email is required"),
  reason: z.enum(["UNSUBSCRIBE", "BOUNCE", "COMPLAINT", "MANUAL"]).default("MANUAL"),
  source: z.string().optional(),
});

const bulkSuppressionSchema = z.object({
  emails: z.array(z.string().email()).min(1, "At least one email required"),
  reason: z.enum(["UNSUBSCRIBE", "BOUNCE", "COMPLAINT", "MANUAL"]).default("MANUAL"),
});

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const reason = searchParams.get("reason") || "";
  const MAX_LIMIT = 100;
  const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.email = { contains: search, mode: "insensitive" };
  }
  if (reason) {
    where.reason = reason;
  }

  const [suppressions, total] = await Promise.all([
    prisma.emailSuppression.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.emailSuppression.count({ where }),
  ]);

  return NextResponse.json({
    suppressions,
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

  // Check if it's a bulk request
  if (body.emails) {
    const parsed = bulkSuppressionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { emails, reason } = parsed.data;
    let added = 0;
    let skipped = 0;

    for (const email of emails) {
      try {
        await prisma.emailSuppression.create({
          data: {
            email: email.toLowerCase(),
            reason,
            source: "manual",
          },
        });
        added++;
      } catch (err: any) {
        // Skip if already exists (unique constraint)
        if (err.code === "P2002") {
          skipped++;
        } else {
          throw err;
        }
      }
    }

    await logActivity({
      action: "CREATE",
      entityType: "EmailSuppression",
      entityId: "bulk",
      summary: `Bulk added ${added} emails to suppression list (reason: ${reason})`,
      userId: session!.user.id,
    });

    return NextResponse.json({ added, skipped }, { status: 201 });
  }

  // Single email
  const parsed = suppressionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, reason, source } = parsed.data;

  // Check if already suppressed
  const existing = await prisma.emailSuppression.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Email is already suppressed" },
      { status: 400 }
    );
  }

  const suppression = await prisma.emailSuppression.create({
    data: {
      email: email.toLowerCase(),
      reason,
      source: source || "manual",
    },
  });

  await logActivity({
    action: "CREATE",
    entityType: "EmailSuppression",
    entityId: suppression.id,
    summary: `Added ${email} to suppression list (reason: ${reason})`,
    userId: session!.user.id,
  });

  return NextResponse.json(suppression, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const { email, ids } = body;

  if (ids && Array.isArray(ids)) {
    // Bulk delete by IDs
    const deleted = await prisma.emailSuppression.deleteMany({
      where: { id: { in: ids } },
    });

    await logActivity({
      action: "DELETE",
      entityType: "EmailSuppression",
      entityId: "bulk",
      summary: `Removed ${deleted.count} emails from suppression list`,
      userId: session!.user.id,
    });

    return NextResponse.json({ removed: deleted.count });
  }

  if (email) {
    // Single delete by email
    const existing = await prisma.emailSuppression.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Email not found in suppression list" },
        { status: 404 }
      );
    }

    await prisma.emailSuppression.delete({
      where: { email: email.toLowerCase() },
    });

    await logActivity({
      action: "DELETE",
      entityType: "EmailSuppression",
      entityId: existing.id,
      summary: `Removed ${email} from suppression list`,
      userId: session!.user.id,
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "Either 'email' or 'ids' is required" },
    { status: 400 }
  );
}
