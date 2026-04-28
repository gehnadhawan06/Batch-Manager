import { Router } from "express";
import { z } from "zod";
import { getActorScope, isTeacherOutOfScope, parsePositiveInt } from "../../lib/accessScope";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;
  const section = typeof req.query.section === "string" ? req.query.section : undefined;
  const studentIdQueryRaw = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  const studentIdQuery = studentIdQueryRaw ? parsePositiveInt(studentIdQueryRaw) : undefined;
  if (studentIdQueryRaw && !studentIdQuery) {
    return res.status(400).json({ message: "Invalid studentId query param" });
  }
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  if (isTeacherOutOfScope(actor, { branch, section })) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
  }

  const marks = await prisma.mark.findMany({
    where: {
      ...(actor.role === "TEACHER" ? { branch: actor.branch!, section: actor.section! } : {}),
      ...(actor.role === "STUDENT" ? { studentId: actor.id } : {}),
      ...(branch ? { branch } : {}),
      ...(section ? { section } : {}),
      ...(studentIdQuery ? { studentId: studentIdQuery } : {}),
    },
    orderBy: [{ assessment: "asc" }, { studentId: "asc" }],
  });

  return res.json(marks);
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

  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  if (isTeacherOutOfScope(actor, { branch: parsed.data.branch, section: parsed.data.section })) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
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

  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  if (isTeacherOutOfScope(actor, { branch: parsed.data.branch, section: parsed.data.section })) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
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

const updateMarkSchema = z.object({
  marks: z.number().int().nonnegative().nullable(),
});

router.patch("/:id", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const parsed = updateMarkSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const markId = parsePositiveInt(req.params.id);
  if (!markId) {
    return res.status(400).json({ message: "Invalid mark id" });
  }
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  const current = await prisma.mark.findUnique({ where: { id: markId } });
  if (!current) {
    return res.status(404).json({ message: "Mark not found" });
  }
  if (isTeacherOutOfScope(actor, current)) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
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

export const marksRouter = router;
