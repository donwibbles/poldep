import { z } from "zod";

export const INITIATIVE_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const TARGET_RESPONSE_STATUSES = [
  "NOT_CONTACTED",
  "AWAITING_RESPONSE",
  "RESPONDED_POSITIVE",
  "RESPONDED_NEGATIVE",
  "RESPONDED_NEUTRAL",
  "NO_RESPONSE",
] as const;

export const TARGET_RESPONSE_LABELS: Record<string, string> = {
  NOT_CONTACTED: "Not Contacted",
  AWAITING_RESPONSE: "Awaiting Response",
  RESPONDED_POSITIVE: "Supports",
  RESPONDED_NEGATIVE: "Opposes",
  RESPONDED_NEUTRAL: "Neutral",
  NO_RESPONSE: "No Response",
};

export const initiativeSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(INITIATIVE_STATUSES).optional(),
  goalDate: z
    .string()
    .or(z.date())
    .transform((val) => (val ? new Date(val) : null))
    .optional()
    .nullable(),
});

export const initiativeUpdateSchema = initiativeSchema.partial();

export const addTargetsSchema = z.object({
  contactIds: z.array(z.string()).min(1, "At least one contact is required"),
  priority: z.number().int().min(0).max(10).optional(),
});

export const updateTargetSchema = z.object({
  responseStatus: z.enum(TARGET_RESPONSE_STATUSES).optional(),
  responseDate: z
    .string()
    .or(z.date())
    .transform((val) => (val ? new Date(val) : null))
    .optional()
    .nullable(),
  responseNotes: z.string().max(2000).optional().nullable(),
  priority: z.number().int().min(0).max(10).optional(),
});

export type InitiativeFormData = z.infer<typeof initiativeSchema>;
export type InitiativeUpdateData = z.infer<typeof initiativeUpdateSchema>;
export type AddTargetsData = z.infer<typeof addTargetsSchema>;
export type UpdateTargetData = z.infer<typeof updateTargetSchema>;
