import { QueryStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { getActorScope, isTeacherOutOfScope, parsePositiveInt } from "../../lib/accessScope";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const studentIdQueryRaw = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
  const markIdQueryRaw = typeof req.query.markId === "string" ? req.query.markId : undefined;
  const studentIdQuery = studentIdQueryRaw ? parsePositiveInt(studentIdQueryRaw) : undefined;
  const markIdQuery = markIdQueryRaw ? parsePositiveInt(markIdQueryRaw) : undefined;
  if ((studentIdQueryRaw && !studentIdQuery) || (markIdQueryRaw && !markIdQuery)) {
    return res.status(400).json({ message: "Invalid query param ids" });
  }
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }

  const queries = await prisma.query.findMany({
    where: {
      ...(actor.role === "TEACHER" ? { mark: { branch: actor.branch!, section: actor.section! } } : {}),
      ...(studentIdQuery ? { studentId: studentIdQuery } : {}),
      ...(markIdQuery ? { markId: markIdQuery } : {}),
      ...(req.user?.role === "STUDENT" ? { studentId: req.user.userId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(
    queries.map((query) => ({
      ...query,
      status: query.status.toLowerCase(),
      createdAt: query.createdAt.toISOString(),
      resolvedAt: query.resolvedAt?.toISOString() ?? null,
    })),
  );
});

const createQuerySchema = z.object({
  studentId: z.number().int().positive().optional(),
  markId: z.number().int().positive(),
  queryText: z.string().min(3),
});

router.post("/", requireAuth, requireRoles("STUDENT", "ADMIN"), async (req, res) => {
  const parsed = createQuerySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const studentId = req.user!.role === "STUDENT" ? req.user!.userId : parsed.data.studentId;
  if (!studentId) {
    return res.status(400).json({ message: "studentId is required for admin query creation" });
  }

  const mark = await prisma.mark.findUnique({
    where: { id: parsed.data.markId },
    select: { id: true, studentId: true },
  });
  if (!mark) {
    return res.status(404).json({ message: "Mark not found" });
  }
  if (mark.studentId !== studentId) {
    return res.status(403).json({ message: "You can only raise query for your own mark" });
  }

  const created = await prisma.query.create({
    data: {
      studentId,
      markId: parsed.data.markId,
      queryText: parsed.data.queryText,
      status: QueryStatus.OPEN,
    },
  });

  return res.status(201).json({
    ...created,
    status: created.status.toLowerCase(),
    createdAt: created.createdAt.toISOString(),
    resolvedAt: created.resolvedAt?.toISOString() ?? null,
  });
});

const respondSchema = z.object({
  response: z.string().min(1),
});

router.patch("/:id/respond", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const queryId = parsePositiveInt(req.params.id);
  if (!queryId) {
    return res.status(400).json({ message: "Invalid query id" });
  }
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  const existing = await prisma.query.findUnique({
    where: { id: queryId },
    include: { mark: { select: { branch: true, section: true } } },
  });
  if (!existing) {
    return res.status(404).json({ message: "Query not found" });
  }
  if (isTeacherOutOfScope(actor, existing.mark)) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
  }

  const updated = await prisma.query.update({
    where: { id: queryId },
    data: {
      response: parsed.data.response,
      status: QueryStatus.CLOSED,
      resolvedAt: new Date(),
    },
  });

  return res.json({
    ...updated,
    status: updated.status.toLowerCase(),
    createdAt: updated.createdAt.toISOString(),
    resolvedAt: updated.resolvedAt?.toISOString() ?? null,
  });
});

export const queriesRouter = router;
