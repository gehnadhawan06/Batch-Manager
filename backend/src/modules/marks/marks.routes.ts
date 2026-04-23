import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;
  const section = typeof req.query.section === "string" ? req.query.section : undefined;
  const studentIdQuery = typeof req.query.studentId === "string" ? Number(req.query.studentId) : undefined;

  const marks = await prisma.mark.findMany({
    where: {
      ...(branch ? { branch } : {}),
      ...(section ? { section } : {}),
      ...(studentIdQuery ? { studentId: studentIdQuery } : {}),
      ...(req.user?.role === "STUDENT" ? { studentId: req.user.userId } : {}),
    },
    orderBy: [{ assessment: "asc" }, { studentId: "asc" }],
  });

  return res.json(marks);
});

const updateMarkSchema = z.object({
  marks: z.number().int().nonnegative().nullable(),
});

router.patch("/:id", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const parsed = updateMarkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const markId = Number(req.params.id);
  const current = await prisma.mark.findUnique({ where: { id: markId } });
  if (!current) {
    return res.status(404).json({ message: "Mark not found" });
  }
  if (current.isFrozen) {
    return res.status(400).json({ message: "Assessment is frozen" });
  }

  const updated = await prisma.mark.update({
    where: { id: markId },
    data: { marks: parsed.data.marks },
  });
  return res.json(updated);
});

const freezeSchema = z.object({
  assessment: z.string(),
  branch: z.string(),
  section: z.string(),
});

router.patch("/freeze", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const parsed = freezeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const result = await prisma.mark.updateMany({
    where: {
      assessment: parsed.data.assessment,
      branch: parsed.data.branch,
      section: parsed.data.section,
    },
    data: { isFrozen: true },
  });

  return res.json({ updated: result.count });
});

router.patch("/unfreeze", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const parsed = freezeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const result = await prisma.mark.updateMany({
    where: {
      assessment: parsed.data.assessment,
      branch: parsed.data.branch,
      section: parsed.data.section,
    },
    data: { isFrozen: false },
  });

  return res.json({ updated: result.count });
});

export const marksRouter = router;
