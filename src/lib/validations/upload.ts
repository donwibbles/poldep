import { z } from "zod";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const presignSchema = z.object({
  fileName: z.string().min(1, "File name is required").max(500),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    error: "File type is not allowed",
  }),
  fileSize: z.number().int().positive().max(25 * 1024 * 1024, "File size exceeds 25 MB limit"),
  entityType: z.enum(["contact", "communication", "endorsement"]),
  entityId: z.string().min(1),
});

export type PresignFormData = z.infer<typeof presignSchema>;
