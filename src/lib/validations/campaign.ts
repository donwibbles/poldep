import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(["ONE_TIME", "DRIP_SEQUENCE"]).default("ONE_TIME"),
  templateId: z.string().optional().nullable(),
  subject: z.string().max(500).optional().nullable(),
  body: z.string().optional().nullable(),
  scheduledAt: z
    .string()
    .or(z.date())
    .transform((val) => (val ? new Date(val) : null))
    .optional()
    .nullable(),
});

export const campaignUpdateSchema = campaignSchema.partial();

export const addRecipientsSchema = z.object({
  contactIds: z.array(z.string()).min(1, "At least one contact is required"),
  emailStaff: z.boolean().optional().default(false),
});

export const sequenceStepSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  subject: z.string().max(500).optional().nullable(),
  body: z.string().optional().nullable(),
  delayDays: z.number().int().min(0, "Delay must be 0 or more days"),
  stepOrder: z.number().int().min(0),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;
export type CampaignUpdateFormData = z.infer<typeof campaignUpdateSchema>;
export type AddRecipientsFormData = z.infer<typeof addRecipientsSchema>;
export type SequenceStepFormData = z.infer<typeof sequenceStepSchema>;
