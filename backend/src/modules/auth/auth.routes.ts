import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const registerStudentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  branch: z.string().optional(),
  section: z.string().optional(),
  batch: z.string().optional(),
});

const router = Router();

function makeAccessToken(userId: number, role: UserRole) {
  return jwt.sign({ userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

function makeRefreshToken(userId: number) {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = makeAccessToken(user.id, user.role);
  const refreshToken = makeRefreshToken(user.id);
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      section: user.section,
      batch: user.batch,
    },
  });
});

router.post("/register/student", async (req, res) => {
  const parsed = registerStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: UserRole.STUDENT,
      branch: parsed.data.branch ?? "IT",
      section: parsed.data.section ?? "1",
      batch: parsed.data.batch ?? "2024",
    },
  });

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branch,
    section: user.section,
    batch: user.batch,
  });
});

router.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const { refreshToken } = parsed.data;
  let decoded: { userId: number };
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: number };
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const savedTokens = await prisma.refreshToken.findMany({
    where: { userId: decoded.userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const validRecord = (
    await Promise.all(
      savedTokens.map(async (record) => ({
        record,
        matched: await bcrypt.compare(refreshToken, record.tokenHash),
      })),
    )
  ).find((item) => item.matched)?.record;

  if (!validRecord || validRecord.expiresAt < new Date()) {
    return res.status(401).json({ message: "Refresh token expired or revoked" });
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const accessToken = makeAccessToken(user.id, user.role);
  return res.json({ accessToken });
});

router.post("/logout", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const { refreshToken } = parsed.data;
  const userPayload = jwt.decode(refreshToken) as { userId?: number } | null;
  if (!userPayload?.userId) {
    return res.status(200).json({ message: "Logged out" });
  }

  const records = await prisma.refreshToken.findMany({
    where: { userId: userPayload.userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  for (const record of records) {
    const matched = await bcrypt.compare(refreshToken, record.tokenHash);
    if (matched) {
      await prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
      break;
    }
  }

  return res.status(200).json({ message: "Logged out" });
});

export const authRouter = router;
