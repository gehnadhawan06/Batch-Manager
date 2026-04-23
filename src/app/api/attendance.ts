import { apiFetch } from "./client";

export interface AttendanceRecordDto {
  id: number;
  studentId: number;
  date: string;
  time: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  ipAddress: string;
  deviceId: string;
  proxyWarning?: boolean;
  branch: string;
  section: string;
}

export async function getAttendanceRecords(params: {
  branch?: string;
  section?: string;
  studentId?: number;
}) {
  const search = new URLSearchParams();
  if (params.branch) search.set("branch", params.branch);
  if (params.section) search.set("section", params.section);
  if (params.studentId) search.set("studentId", String(params.studentId));

  const query = search.toString();
  return apiFetch<AttendanceRecordDto[]>(`/attendance${query ? `?${query}` : ""}`);
}

export async function markAttendance(payload: {
  studentId: number;
  ipAddress: string;
  deviceId: string;
}) {
  return apiFetch<AttendanceRecordDto>("/attendance", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function approveAttendance(recordId: number) {
  return apiFetch<AttendanceRecordDto>(`/attendance/${recordId}/approve`, { method: "PATCH" });
}

export async function denyAttendance(recordId: number) {
  return apiFetch<AttendanceRecordDto>(`/attendance/${recordId}/deny`, { method: "PATCH" });
}

export async function cancelAttendance(recordId: number) {
  return apiFetch<AttendanceRecordDto>(`/attendance/${recordId}/cancel`, { method: "PATCH" });
}
