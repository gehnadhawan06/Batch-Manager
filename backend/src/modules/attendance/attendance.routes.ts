import { AttendanceStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { getActorScope, isTeacherOutOfScope, parsePositiveInt } from "../../lib/accessScope";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();

const markAttendanceSchema = z.object({
  studentId: z.number().int().positive(),
  date: z.string().datetime().optional(),
  ipAddress: z.string().default("0.0.0.0"),
  deviceId: z.string().min(3),
});

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

  const where = {
    ...(branch || section || actor.role === "TEACHER"
      ? {
          student: {
            ...(branch ? { branch } : {}),
            ...(section ? { section } : {}),
            ...(actor.role === "TEACHER" ? { branch: actor.branch!, section: actor.section!, batch: actor.batch! } : {}),
          },
        }
      : {}),
    ...(studentIdQuery ? { studentId: studentIdQuery } : {}),
    ...(req.user?.role === "STUDENT" ? { studentId: req.user.userId } : {}),
  };

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: { student: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return res.json(
    records.map((record) => ({
      id: record.id,
      studentId: record.studentId,
      date: record.date.toISOString().split("T")[0],
      time: record.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      status: record.status.toLowerCase(),
      ipAddress: record.ipAddress,
      deviceId: record.deviceId,
      proxyWarning: record.proxyFlag,
      branch: record.student.branch,
      section: record.student.section,
    })),
  );
});

router.post("/", requireAuth, requireRoles("STUDENT", "TEACHER", "ADMIN"), async (req, res) => {
  const parsed = markAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const targetStudentId = req.user!.role === "STUDENT" ? req.user!.userId : parsed.data.studentId;
  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }

  const targetStudent = await prisma.user.findUnique({
    where: { id: targetStudentId },
    select: { id: true, role: true, branch: true, section: true, batch: true },
  });
  if (!targetStudent || targetStudent.role !== "STUDENT") {
    return res.status(404).json({ message: "Student not found" });
  }
  if (isTeacherOutOfScope(actor, targetStudent)) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
  }

  const existing = await prisma.attendanceRecord.findFirst({
    where: { studentId: targetStudentId, date },
  });

  if (existing) {
    return res.status(409).json({ message: "Attendance already marked for this day" });
  }

  const proxyConflict = await prisma.attendanceRecord.findFirst({
    where: {
      studentId: { not: targetStudentId },
      date,
      OR: [{ ipAddress: parsed.data.ipAddress }, { deviceId: parsed.data.deviceId }],
    },
    select: { id: true },
  });

  const record = await prisma.attendanceRecord.create({
    data: {
      studentId: targetStudentId,
      date,
      status: AttendanceStatus.PENDING,
      ipAddress: parsed.data.ipAddress,
      deviceId: parsed.data.deviceId,
      proxyFlag: Boolean(proxyConflict),
    },
  });

  return res.status(201).json(record);
});

async function updateStatus(recordId: number, status: AttendanceStatus) {
  return prisma.attendanceRecord.update({
    where: { id: recordId },
    data: { status },
  });
}

router.patch("/:id/approve", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const recordId = parsePositiveInt(req.params.id);
  if (!recordId) {
    return res.status(400).json({ message: "Invalid attendance id" });
  }
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  const existing = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: { student: { select: { branch: true, section: true, batch: true } } },
  });
  if (!existing) {
    return res.status(404).json({ message: "Attendance record not found" });
  }
  if (isTeacherOutOfScope(actor, existing.student)) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
  }
  const record = await updateStatus(recordId, AttendanceStatus.APPROVED);
  return res.json(record);
});

router.patch("/:id/deny", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const recordId = parsePositiveInt(req.params.id);
  if (!recordId) {
    return res.status(400).json({ message: "Invalid attendance id" });
  }
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  const existing = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: { student: { select: { branch: true, section: true, batch: true } } },
  });
  if (!existing) {
    return res.status(404).json({ message: "Attendance record not found" });
  }
  if (isTeacherOutOfScope(actor, existing.student)) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
  }
  const record = await updateStatus(recordId, AttendanceStatus.DENIED);
  return res.json(record);
});

router.patch("/:id/cancel", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const recordId = parsePositiveInt(req.params.id);
  if (!recordId) {
    return res.status(400).json({ message: "Invalid attendance id" });
  }
  const actor = await getActorScope(req.user!.userId);
  if (!actor) {
    return res.status(401).json({ message: "User not found" });
  }
  const existing = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: { student: { select: { branch: true, section: true, batch: true } } },
  });
  if (!existing) {
    return res.status(404).json({ message: "Attendance record not found" });
  }
  if (isTeacherOutOfScope(actor, existing.student)) {
    return res.status(403).json({ message: "Forbidden outside your assigned batch scope" });
  }
  const record = await updateStatus(recordId, AttendanceStatus.CANCELLED);
  return res.json(record);
});

export const attendanceRouter = router;
