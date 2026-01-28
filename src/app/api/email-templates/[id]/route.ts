import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/auth-helpers";
import { logActivity } from "@/lib/activity";
import { emailTemplateSchema } from "@/lib/validations/email-template";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          campaigns: true,
          sequenceSteps: true,
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Email template not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(template);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = emailTemplateSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Email template not found" },
      { status: 404 }
    );
  }

  // If this template is being set as default, unset any existing default
  if (parsed.data.isDefault) {
    await prisma.emailTemplate.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const template = await prisma.emailTemplate.update({
    where: { id },
    data: parsed.data,
  });

  await logActivity({
    action: "UPDATE",
    entityType: "EmailTemplate",
    entityId: template.id,
    summary: `Updated email template "${template.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json(template);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.emailTemplate.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          campaigns: true,
          sequenceSteps: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Email template not found" },
      { status: 404 }
    );
  }

  // Prevent deletion if template is in use
  if (existing._count.campaigns > 0 || existing._count.sequenceSteps > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete template that is in use by campaigns",
      },
      { status: 400 }
    );
  }

  await prisma.emailTemplate.delete({ where: { id } });

  await logActivity({
    action: "DELETE",
    entityType: "EmailTemplate",
    entityId: id,
    summary: `Deleted email template "${existing.name}"`,
    userId: session!.user.id,
  });

  return NextResponse.json({ success: true });
}
