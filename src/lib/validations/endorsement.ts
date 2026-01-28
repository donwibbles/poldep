import { z } from "zod";

export const endorsementSchema = z.object({
  candidateId: z.string().min(1, "Candidate is required"),
  raceId: z.string().min(1, "Race is required"),
  currentStageId: z.string().min(1, "Stage is required"),
  assignedToId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  previousEndorsementId: z.string().optional().nullable(),
});

export const advanceStageSchema = z.object({
  stageId: z.string().min(1, "Target stage is required"),
  notes: z.string().optional().nullable(),
});

export const overrideEditSchema = z.object({
  reason: z.string().min(1, "Override reason is required"),
  data: z.record(z.string(), z.unknown()),
});

export type EndorsementFormData = z.infer<typeof endorsementSchema>;
