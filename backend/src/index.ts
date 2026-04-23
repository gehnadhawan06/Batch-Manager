import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { errorHandler } from "./middleware/errorHandler";
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
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "batch-manager-backend" });
});

app.use("/auth", authRouter);
app.use("/", usersRouter);
app.use("/attendance", attendanceRouter);
app.use("/assignments", assignmentsRouter);
app.use("/submissions", submissionsRouter);
app.use("/marks", marksRouter);
app.use("/queries", queriesRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
