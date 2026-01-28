import { z } from "zod";

export const electionSchema = z.object({
  name: z.string().min(1, "Name is required").max(300),
  type: z.enum(["PRIMARY", "GENERAL", "SPECIAL"]),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  cycle: z.string().min(1, "Cycle is required").max(10),
});

export const raceSchema = z.object({
  office: z.string().min(1, "Office is required").max(300),
  district: z.string().max(100).optional().nullable(),
  electionId: z.string().min(1, "Election is required"),
});

export const raceCandidateSchema = z.object({
  contactId: z.string().min(1, "Candidate is required"),
  isIncumbent: z.boolean().default(false),
});

export type ElectionFormData = z.infer<typeof electionSchema>;
export type RaceFormData = z.infer<typeof raceSchema>;
