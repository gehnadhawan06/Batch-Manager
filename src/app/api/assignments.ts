import { apiFetch } from "./client";

export interface AssignmentDto {
  id: number;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
  branch: string;
  section: string;
  subject: string;
}

export async function getAssignments(params: { branch?: string; section?: string }) {
  const search = new URLSearchParams();
  if (params.branch) search.set("branch", params.branch);
  if (params.section) search.set("section", params.section);
  const query = search.toString();
  return apiFetch<AssignmentDto[]>(`/assignments${query ? `?${query}` : ""}`);
}

export async function createAssignment(payload: Omit<AssignmentDto, "id" | "createdAt">) {
  return apiFetch<AssignmentDto>("/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitAssignment(assignmentId: number, payload: { studentId: number; fileUrl?: string }) {
  return apiFetch(`/assignments/${assignmentId}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
