import { z } from "zod";

export const positionAssignmentSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  positionTitle: z.string().min(1, "Position title is required").max(200),
  jurisdiction: z.string().max(200).optional().nullable(),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  notes: z.string().optional().nullable(),
});

export const endPositionSchema = z.object({
  endDate: z.string().or(z.date()).transform((val) => new Date(val)),
  notes: z.string().optional().nullable(),
});

export type PositionAssignmentFormData = z.infer<typeof positionAssignmentSchema>;
export type EndPositionFormData = z.infer<typeof endPositionSchema>;
