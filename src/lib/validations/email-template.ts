import { z } from "zod";

export const emailTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Body is required"),
  isDefault: z.boolean().optional(),
});

export type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;
