import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

export interface ActorScope {
  id: number;
  role: UserRole;
  branch: string | null;
  section: string | null;
  batch: string | null;
}

export async function getActorScope(userId: number): Promise<ActorScope | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      branch: true,
      section: true,
      batch: true,
    },
  });
}

export function parsePositiveInt(input: unknown): number | null {
  if (typeof input !== "string" && typeof input !== "number") {
    return null;
  }
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

export function isTeacherOutOfScope(
  actor: ActorScope,
  target: { branch?: string | null; section?: string | null; batch?: string | null },
) {
  if (actor.role !== "TEACHER") {
    return false;
  }

  if (!actor.branch || !actor.section || !actor.batch) {
    return true;
  }

  if (target.branch && target.branch !== actor.branch) {
    return true;
  }
  if (target.section && target.section !== actor.section) {
    return true;
  }
  if (target.batch && target.batch !== actor.batch) {
    return true;
  }

  return false;
}
