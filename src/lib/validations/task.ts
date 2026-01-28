import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().optional().nullable(),
  dueDate: z.string().or(z.date()).transform((val) => new Date(val)).optional().nullable(),
  status: z.enum(["PENDING", "DONE"]).default("PENDING"),
  assignedToId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  endorsementId: z.string().optional().nullable(),
});

export type TaskFormData = z.infer<typeof taskSchema>;
