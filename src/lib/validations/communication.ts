import { z } from "zod";

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
});

export type CommunicationFormData = z.infer<typeof communicationSchema>;
