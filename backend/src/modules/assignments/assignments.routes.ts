import { SubmissionStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();

const createAssignmentSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  deadline: z.string().datetime(),
  branch: z.string(),
  section: z.string(),
  subject: z.string(),
});

router.post("/", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const parsed = createAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const assignment = await prisma.assignment.create({
    data: {
      ...parsed.data,
      deadline: new Date(parsed.data.deadline),
      createdBy: req.user!.userId,
    },
  });

  const branchStudents = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      branch: parsed.data.branch,
      section: parsed.data.section,
    },
    select: { id: true },
  });

  if (branchStudents.length > 0) {
    await prisma.submission.createMany({
      data: branchStudents.map((student) => ({
        assignmentId: assignment.id,
        studentId: student.id,
        status: SubmissionStatus.NOT_SUBMITTED,
      })),
      skipDuplicates: true,
    });
  }

  return res.status(201).json(assignment);
});

router.get("/", requireAuth, async (req, res) => {
  const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;
  const section = typeof req.query.section === "string" ? req.query.section : undefined;

  const assignments = await prisma.assignment.findMany({
    where: {
      ...(branch ? { branch } : {}),
      ...(section ? { section } : {}),
    },
    orderBy: { deadline: "asc" },
  });

  return res.json(
    assignments.map((assignment) => ({
      ...assignment,
      createdAt: assignment.createdAt.toISOString(),
      deadline: assignment.deadline.toISOString(),
    })),
  );
});

const submitSchema = z.object({
  studentId: z.number().int().positive().optional(),
  fileUrl: z.string().url().optional(),
});

router.post("/:id/submit", requireAuth, requireRoles("STUDENT", "TEACHER", "ADMIN"), async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const assignmentId = Number(req.params.id);
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) {
    return res.status(404).json({ message: "Assignment not found" });
  }

  if (new Date() > assignment.deadline) {
    return res.status(400).json({ message: "Deadline passed" });
  }

  const studentId = req.user!.role === "STUDENT" ? req.user!.userId : parsed.data.studentId;
  if (!studentId) {
    return res.status(400).json({ message: "studentId is required for teacher/admin submit" });
  }

  const submission = await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId } },
    update: {
      status: SubmissionStatus.SUBMITTED_FILE,
      fileUrl: parsed.data.fileUrl,
      submittedAt: new Date(),
    },
    create: {
      assignmentId,
      studentId,
      status: SubmissionStatus.SUBMITTED_FILE,
      fileUrl: parsed.data.fileUrl,
      submittedAt: new Date(),
    },
  });

  return res.json({
    ...submission,
    status: submission.status.toLowerCase(),
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    fileName: submission.fileUrl ?? undefined,
  });
});

export const assignmentsRouter = router;
