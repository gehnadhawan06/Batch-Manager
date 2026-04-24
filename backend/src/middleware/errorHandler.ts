import { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err }, "Unhandled server error");
  return res.status(500).json({ message });
}
