import { z } from "zod";

export const contactRatingSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  rating: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]),
  notes: z.string().optional().nullable(),
});

export type ContactRatingFormData = z.infer<typeof contactRatingSchema>;
