import { z } from "zod";

export const pipelineStageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  order: z.number().int().min(0),
  isFinal: z.boolean().default(false),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").default("#6B7280"),
});

export const reorderStagesSchema = z.object({
  stages: z.array(z.object({
    id: z.string(),
    order: z.number().int().min(0),
  })),
});

export type PipelineStageFormData = z.infer<typeof pipelineStageSchema>;
