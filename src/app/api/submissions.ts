import { apiFetch } from "./client";

export interface SubmissionDto {
  id: number;
  assignmentId: number;
  studentId: number;
  status: "not_submitted" | "submitted_file" | "submitted_manual";
  fileName?: string;
  submittedAt?: string | null;
}

export async function getSubmissions(params: { assignmentId?: number; studentId?: number }) {
  const search = new URLSearchParams();
  if (params.assignmentId) search.set("assignmentId", String(params.assignmentId));
  if (params.studentId) search.set("studentId", String(params.studentId));
  const query = search.toString();
  return apiFetch<SubmissionDto[]>(`/submissions${query ? `?${query}` : ""}`);
}

export async function markSubmissionManual(submissionId: number) {
  return apiFetch<SubmissionDto>(`/submissions/${submissionId}/manual`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
}
