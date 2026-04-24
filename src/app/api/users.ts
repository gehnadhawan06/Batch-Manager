import { apiFetch } from "./client";

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  branch: string | null;
  section: string | null;
  batch: string | null;
}

interface ListStudentsFilters {
  branch?: string;
  section?: string;
  batch?: string;
}

export async function listStudents(filters: ListStudentsFilters = {}): Promise<UserListItem[]> {
  const params = new URLSearchParams();
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.section) params.set("section", filters.section);
  if (filters.batch) params.set("batch", filters.batch);

  const query = params.toString();
  return apiFetch<UserListItem[]>(`/students${query ? `?${query}` : ""}`);
}

export async function listTeachers(): Promise<UserListItem[]> {
  return apiFetch<UserListItem[]>("/teachers");
}
