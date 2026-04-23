import { AttendanceStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
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
  const studentIdQuery = typeof req.query.studentId === "string" ? Number(req.query.studentId) : undefined;

  const where = {
    ...(branch ? { student: { branch } } : {}),
    ...(section ? { student: { ...(branch ? { branch } : {}), section } } : {}),
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

  const existing = await prisma.attendanceRecord.findFirst({
    where: { studentId: targetStudentId, date },
  });

  if (existing) {
    return res.status(409).json({ message: "Attendance already marked for this day" });
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      studentId: targetStudentId,
      date,
      status: AttendanceStatus.PENDING,
      ipAddress: parsed.data.ipAddress,
      deviceId: parsed.data.deviceId,
      proxyFlag: false,
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
  const record = await updateStatus(Number(req.params.id), AttendanceStatus.APPROVED);
  return res.json(record);
});

router.patch("/:id/deny", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const record = await updateStatus(Number(req.params.id), AttendanceStatus.DENIED);
  return res.json(record);
});

router.patch("/:id/cancel", requireAuth, requireRoles("TEACHER", "ADMIN"), async (req, res) => {
  const record = await updateStatus(Number(req.params.id), AttendanceStatus.CANCELLED);
  return res.json(record);
});

export const attendanceRouter = router;
