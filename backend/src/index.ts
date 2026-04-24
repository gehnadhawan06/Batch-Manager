import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { httpLogger, logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { errorHandler } from "./middleware/errorHandler";
import { apiRateLimiter, authRateLimiter } from "./middleware/rateLimit";
import { assignmentsRouter } from "./modules/assignments/assignments.routes";
import { attendanceRouter } from "./modules/attendance/attendance.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { marksRouter } from "./modules/marks/marks.routes";
import { queriesRouter } from "./modules/queries/queries.routes";
import { submissionsRouter } from "./modules/submissions/submissions.routes";
import { usersRouter } from "./modules/users/users.routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(httpLogger);
app.use(express.json());
app.use(apiRateLimiter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "batch-manager-backend" });
});

app.use("/auth", authRateLimiter, authRouter);
app.use("/", usersRouter);
app.use("/attendance", attendanceRouter);
app.use("/assignments", assignmentsRouter);
app.use("/submissions", submissionsRouter);
app.use("/marks", marksRouter);
app.use("/queries", queriesRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Backend server started");
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
