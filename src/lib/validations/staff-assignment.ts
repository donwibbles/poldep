import { z } from "zod";

export const createStaffAssignmentSchema = z.object({
  staffContactId: z.string().min(1, "Staff contact is required"),
  parentContactId: z.string().min(1, "Parent contact is required"),
  startDate: z.coerce.date().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const endStaffAssignmentSchema = z.object({
  endDate: z.coerce.date(),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateStaffAssignmentData = z.infer<typeof createStaffAssignmentSchema>;
export type EndStaffAssignmentData = z.infer<typeof endStaffAssignmentSchema>;
