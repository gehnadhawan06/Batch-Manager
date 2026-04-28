import { SubmissionStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { getActorScope, isTeacherOutOfScope, parsePositiveInt } from "../../lib/accessScope";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();

const manualSchema = z.object({
  submittedAt: z.string().datetime().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const assignmentIdRaw = typeof req.query.assignmentId === "string" ? req.query.assignmentId : undefined;
  const studentIdQueryRaw = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  const assignmentId = assignmentIdRaw ? parsePositiveInt(assignmentIdRaw) : undefined;
  const studentIdQuery = studentIdQueryRaw ? parsePositiveInt(studentIdQueryRaw) : undefined;
  if ((assignmentIdRaw && !assignmentId) || (studentIdQueryRaw && !studentIdQuery)) {
    return res.status(400).json({ message: "Invalid query param ids" });
  }
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }

  const submissions = await prisma.submission.findMany({
    where: {
      ...(actor.role === "TEACHER"
        ? { assignment: { branch: actor.branch!, section: actor.section! }, student: { batch: actor.batch! } }
        : {}),
      ...(assignmentId ? { assignmentId } : {}),
      ...(studentIdQuery ? { studentId: studentIdQuery } : {}),
      ...(req.user?.role === "STUDENT" ? { studentId: req.user.userId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(
    submissions.map((submission) => ({
      id: submission.id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      status: submission.status.toLowerCase(),
      fileName: submission.fileUrl ?? undefined,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
    })),
  );
});

router.patch("/:id/manual", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const parsed = manualSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const submissionId = parsePositiveInt(req.params.id);
  if (!submissionId) {
    return res.status(400).json({ message: "Invalid submission id" });
  }
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  const existing = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { select: { branch: true, section: true } },
      student: { select: { batch: true } },
    },
  });
  if (!existing) {
    return res.status(404).json({ message: "Submission not found" });
  }
  if (
    isTeacherOutOfScope(actor, {
      branch: existing.assignment.branch,
      section: existing.assignment.section,
      batch: existing.student.batch,
    })
  ) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: SubmissionStatus.SUBMITTED_MANUAL,
      submittedAt: parsed.data.submittedAt ? new Date(parsed.data.submittedAt) : new Date(),
    },
  });

  return res.json({
    id: updated.id,
    assignmentId: updated.assignmentId,
    studentId: updated.studentId,
    status: updated.status.toLowerCase(),
    fileName: updated.fileUrl ?? undefined,
    submittedAt: updated.submittedAt?.toISOString() ?? null,
  });
});

export const submissionsRouter = router;
