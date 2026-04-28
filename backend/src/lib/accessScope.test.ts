import assert from "node:assert/strict";
import test from "node:test";
import { isTeacherOutOfScope, parsePositiveInt } from "./accessScope";

test("parsePositiveInt parses valid positive integers", () => {
  assert.equal(parsePositiveInt("12"), 12);
  assert.equal(parsePositiveInt(7), 7);
});

test("parsePositiveInt rejects invalid values", () => {
  assert.equal(parsePositiveInt(""), null);
  assert.equal(parsePositiveInt("abc"), null);
  assert.equal(parsePositiveInt("0"), null);
  assert.equal(parsePositiveInt(-4), null);
  assert.equal(parsePositiveInt(["12"]), null);
});

test("isTeacherOutOfScope allows matching teacher scope", () => {
  const allowed = isTeacherOutOfScope(
    { id: 1, role: "TEACHER", branch: "IT", section: "1", batch: "2024" },
    { branch: "IT", section: "1", batch: "2024" },
  );
  assert.equal(allowed, false);
});

test("isTeacherOutOfScope blocks mismatched teacher scope", () => {
  const blocked = isTeacherOutOfScope(
    { id: 1, role: "TEACHER", branch: "IT", section: "1", batch: "2024" },
    { branch: "CSE", section: "1", batch: "2024" },
  );
  assert.equal(blocked, true);
});
