import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
});

export const magicLinkSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
