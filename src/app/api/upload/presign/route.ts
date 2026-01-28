import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth-helpers";
import { presignSchema } from "@/lib/validations/upload";
import { validateFile, getUploadUrl } from "@/lib/s3";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuthApi();
  if (error) return error;

  const body = await request.json();
  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { fileName, mimeType, fileSize, entityType, entityId } = parsed.data;

  const validation = validateFile(mimeType, fileSize);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const fileKey = `${entityType}/${entityId}/${randomUUID()}-${fileName}`;
  const uploadUrl = await getUploadUrl(fileKey, mimeType, fileSize);

  // Create attachment record
  const attachmentData: any = {
    fileName,
    fileKey,
    fileSize,
    mimeType,
  };
  attachmentData[`${entityType}Id`] = entityId;

  const attachment = await prisma.attachment.create({ data: attachmentData });

  return NextResponse.json({ uploadUrl, attachment });
}
