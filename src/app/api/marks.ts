import { apiFetch } from "./client";

export interface MarkDto {
  id: number;
  studentId: number;
  assessment: string;
  marks: number | null;
  total: number;
  subject: string;
  branch: string;
  section: string;
  isFrozen: boolean;
}

export async function getMarks(params: { branch?: string; section?: string; studentId?: number }) {
  const search = new URLSearchParams();
  if (params.branch) search.set("branch", params.branch);
  if (params.section) search.set("section", params.section);
  if (params.studentId) search.set("studentId", String(params.studentId));
  const query = search.toString();
  return apiFetch<MarkDto[]>(`/marks${query ? `?${query}` : ""}`);
}

export async function updateMark(markId: number, marks: number | null) {
  return apiFetch<MarkDto>(`/marks/${markId}`, {
    method: "PATCH",
    body: JSON.stringify({ marks }),
  });
}

export async function freezeAssessment(assessment: string, branch: string, section: string) {
  return apiFetch<{ updated: number }>("/marks/freeze", {
    method: "PATCH",
    body: JSON.stringify({ assessment, branch, section }),
  });
}

export async function unfreezeAssessment(assessment: string, branch: string, section: string) {
  return apiFetch<{ updated: number }>("/marks/unfreeze", {
    method: "PATCH",
    body: JSON.stringify({ assessment, branch, section }),
  });
}
