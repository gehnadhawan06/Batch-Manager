import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

type Role = "STUDENT" | "TEACHER" | "ADMIN";

interface AccessPayload {
  userId: number;
  role: Role;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: "Missing access token" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    req.user = { userId: decoded.userId, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden for this role" });
    }
    return next();
  };
}
