import { z } from "zod";

export const createAssignmentSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  deadline: z.coerce.date(),
  branch: z.string(),
  section: z.string(),
  subject: z.string(),
  maxMarks: z.number().int().positive().max(1000).default(100),
});

export const submitSchema = z.object({
  studentId: z.number().int().positive().optional(),
  // Frontend currently sends file names for local demo uploads.
  fileUrl: z.string().min(1).optional(),
});
