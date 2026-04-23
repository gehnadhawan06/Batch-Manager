import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRoles } from "../../middleware/auth";

const baseUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  branch: z.string().optional(),
  section: z.string().optional(),
  batch: z.string().optional(),
});

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branch,
    section: user.section,
    batch: user.batch,
  });
});

router.post("/students", requireAuth, requireRoles("ADMIN", "TEACHER"), async (req, res) => {
  const parsed = baseUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      ...parsed.data,
      passwordHash,
      role: UserRole.STUDENT,
    },
  });

  return res.status(201).json({ id: user.id, role: user.role, email: user.email });
});

router.post("/teachers", requireAuth, requireRoles("ADMIN"), async (req, res) => {
  const parsed = baseUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      ...parsed.data,
      passwordHash,
      role: UserRole.TEACHER,
    },
  });

  return res.status(201).json({ id: user.id, role: user.role, email: user.email });
});

export const usersRouter = router;
