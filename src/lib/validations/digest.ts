import { z } from "zod";

export const digestPreferenceSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "NONE"]),
});

export type DigestPreferenceFormData = z.infer<typeof digestPreferenceSchema>;
