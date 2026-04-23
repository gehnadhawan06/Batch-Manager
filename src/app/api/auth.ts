import { apiFetch, setAccessToken } from "./client";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  branch: string | null;
  section: string | null;
  batch: string | null;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AccessTokenResponse {
  accessToken: string;
}

const REFRESH_TOKEN_KEY = "batch_manager_refresh_token";

export function clearSession() {
  setAccessToken(null);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setAccessToken(data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  return data.user;
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return false;
  }

  try {
    const data = await apiFetch<AccessTokenResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    setAccessToken(data.accessToken);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export async function logout() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (refreshToken) {
    try {
      await apiFetch<{ message: string }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore network/logout errors and clear local session anyway.
    }
  }
  clearSession();
}

export async function me(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/me");
}
