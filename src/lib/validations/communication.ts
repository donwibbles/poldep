import { z } from "zod";

// Communication types that expect responses (outbound communications)
export const TRACKABLE_COMM_TYPES = [
  "EMAIL",
  "PHONE_CALL",
  "LEFT_VOICEMAIL",
  "LETTER_MAILER",
  "TEXT",
] as const;

// Types where response tracking doesn't apply
export const NON_TRACKABLE_COMM_TYPES = [
  "MEETING_IN_PERSON",
  "MEETING_VIRTUAL",
  "EVENT_ACTION",
] as const;

export const communicationSchema = z.object({
  type: z.enum(["PHONE_CALL", "MEETING_IN_PERSON", "MEETING_VIRTUAL", "EMAIL", "LETTER_MAILER", "EVENT_ACTION", "TEXT", "LEFT_VOICEMAIL"]),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  subject: z.string().min(1, "Subject is required").max(300),
  notes: z.string().optional().nullable(),
  followUpDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
  endorsementId: z.string().optional().nullable(),
  contactIds: z.array(z.string()).min(1, "At least one contact is required"),
  createFollowUpTask: z.boolean().optional(),
  assignTaskToId: z.string().optional().nullable(),
  responseStatus: z.enum(["AWAITING", "RESPONDED", "NO_RESPONSE", "NOT_APPLICABLE"]).optional(),
});

export type CommunicationFormData = z.infer<typeof communicationSchema>;
