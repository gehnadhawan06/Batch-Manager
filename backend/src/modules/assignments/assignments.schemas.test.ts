import assert from "node:assert/strict";
import test from "node:test";
import { createAssignmentSchema, submitSchema } from "./assignments.schemas";

test("createAssignmentSchema accepts valid payload", () => {
  const result = createAssignmentSchema.safeParse({
    title: "DSA Sheet 1",
    description: "Solve first five questions",
    deadline: "2026-04-30T10:30",
    branch: "IT",
    section: "1",
    subject: "Data Structures",
  });

  assert.equal(result.success, true);
});

test("createAssignmentSchema rejects short description", () => {
  const result = createAssignmentSchema.safeParse({
    title: "DSA Sheet 1",
    description: "ok",
    deadline: "2026-04-30T10:30",
    branch: "IT",
    section: "1",
    subject: "Data Structures",
  });

  assert.equal(result.success, false);
});

test("submitSchema accepts filename payload used by UI", () => {
  const result = submitSchema.safeParse({
    fileUrl: "assignment1.pdf",
  });

  assert.equal(result.success, true);
});
