import { apiFetch } from "./client";

export interface QueryDto {
  id: number;
  studentId: number;
  markId: number;
  queryText: string;
  response?: string | null;
  status: "open" | "closed";
  createdAt: string;
  resolvedAt?: string | null;
}

export async function getQueries(params: { studentId?: number; markId?: number }) {
  const search = new URLSearchParams();
  if (params.studentId) search.set("studentId", String(params.studentId));
  if (params.markId) search.set("markId", String(params.markId));
  const query = search.toString();
  return apiFetch<QueryDto[]>(`/queries${query ? `?${query}` : ""}`);
}

export async function createQuery(payload: { studentId?: number; markId: number; queryText: string }) {
  return apiFetch<QueryDto>("/queries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function respondToQuery(queryId: number, response: string) {
  return apiFetch<QueryDto>(`/queries/${queryId}/respond`, {
    method: "PATCH",
    body: JSON.stringify({ response }),
  });
}
