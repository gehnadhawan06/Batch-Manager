import { SubmissionStatus } from "@prisma/client";
import { Router } from "express";
import { getActorScope, isTeacherOutOfScope, parsePositiveInt } from "../../lib/accessScope";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { createAssignmentSchema, submitSchema } from "./assignments.schemas";

const router = Router();

async function ensureMarksForStudents(args: {
  studentIds: number[];
  assessment: string;
  subject: string;
  branch: string;
  section: string;
  total?: number;
}) {
  const { studentIds, assessment, subject, branch, section, total = 100 } = args;
  if (studentIds.length === 0) {
    return;
  }

  const existing = await prisma.mark.findMany({
    where: {
      studentId: { in: studentIds },
      assessment,
      subject,
      branch,
      section,
    },
    select: { studentId: true },
  });
  const existingIds = new Set(existing.map((row) => row.studentId));
  const missingIds = studentIds.filter((id) => !existingIds.has(id));
  if (missingIds.length === 0) {
    return;
  }

  await prisma.mark.createMany({
    data: missingIds.map((studentId) => ({
      studentId,
      assessment,
      marks: null,
      total,
      subject,
      branch,
      section,
      isFrozen: false,
    })),
  });
}

router.post("/", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const parsed = createAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  if (isTeacherOutOfScope(actor, { branch: parsed.data.branch, section: parsed.data.section })) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
  }

  const { maxMarks, ...assignmentInput } = parsed.data;
  const assignment = await prisma.assignment.create({
    data: {
      ...assignmentInput,
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

    await ensureMarksForStudents({
      studentIds: branchStudents.map((student) => student.id),
      assessment: assignment.title,
      subject: assignment.subject,
      branch: assignment.branch,
      section: assignment.section,
      total: maxMarks,
    });
  }

  return res.status(201).json(assignment);
});

router.get("/", requireAuth, async (req, res) => {
  const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;
  const section = typeof req.query.section === "string" ? req.query.section : undefined;

  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  if (isTeacherOutOfScope(actor, { branch, section })) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      ...(actor.role === "TEACHER" ? { branch: actor.branch!, section: actor.section! } : {}),
      ...(actor.role === "STUDENT" ? { branch: actor.branch ?? undefined, section: actor.section ?? undefined } : {}),
      ...(branch ? { branch } : {}),
      ...(section ? { section } : {}),
    },
    orderBy: { deadline: "asc" },
  });

  // Backfill marks for older assignments created before mark-sync logic existed.
  for (const assignment of assignments) {
    const studentsInScope = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        branch: assignment.branch,
        section: assignment.section,
      },
      select: { id: true },
    });

    await ensureMarksForStudents({
      studentIds: studentsInScope.map((student) => student.id),
      assessment: assignment.title,
      subject: assignment.subject,
      branch: assignment.branch,
      section: assignment.section,
    });
  }

  return res.json(
    assignments.map((assignment) => ({
      ...assignment,
      createdAt: assignment.createdAt.toISOString(),
      deadline: assignment.deadline.toISOString(),
    })),
  );
});

router.post("/:id/submit", requireAuth, requireRoles("STUDENT", "TEACHER", "ADMIN"), async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const assignmentId = parsePositiveInt(req.params.id);
  if (!assignmentId) {
    return res.status(400).json({ message: "Invalid assignment id" });
  }
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
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  if (isTeacherOutOfScope(actor, { branch: assignment.branch, section: assignment.section })) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
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

  await ensureMarksForStudents({
    studentIds: [studentId],
    assessment: assignment.title,
    subject: assignment.subject,
    branch: assignment.branch,
    section: assignment.section,
  });

  return res.json({
    ...submission,
    status: submission.status.toLowerCase(),
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    fileName: submission.fileUrl ?? undefined,
  });
});

export const assignmentsRouter = router;
