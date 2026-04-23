import { SubmissionStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();

const manualSchema = z.object({
  submittedAt: z.string().datetime().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const assignmentId = typeof req.query.assignmentId === "string" ? Number(req.query.assignmentId) : undefined;
  const studentIdQuery = typeof req.query.studentId === "string" ? Number(req.query.studentId) : undefined;

  const submissions = await prisma.submission.findMany({
    where: {
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

  const submissionId = Number(req.params.id);
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
