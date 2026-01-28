import { z } from "zod";

export const createDigestSubscriberSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(200),
  frequency: z.enum(["DAILY", "WEEKLY"]),
});

export const updateDigestSubscriberSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  frequency: z.enum(["DAILY", "WEEKLY"]).optional(),
  isActive: z.boolean().optional(),
});

export type CreateDigestSubscriberData = z.infer<typeof createDigestSubscriberSchema>;
export type UpdateDigestSubscriberData = z.infer<typeof updateDigestSubscriberSchema>;
