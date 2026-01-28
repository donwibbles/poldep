import { z } from "zod";

export const contactSchema = z.object({
  type: z.enum(["CANDIDATE", "ELECTED_OFFICIAL", "STAFF", "ORGANIZATION"]),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  title: z.string().max(200).optional().nullable(),
  organization: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  party: z.string().max(100).optional().nullable(),
  website: z.string().url().max(500).optional().nullable().or(z.literal("")),
  twitter: z.string().max(100).optional().nullable(),
  facebook: z.string().max(200).optional().nullable(),
  instagram: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  notes: z.string().optional().nullable(),
  parentContactId: z.string().optional().nullable(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
