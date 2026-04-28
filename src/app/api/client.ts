const API_BASE_URL = "http://localhost:4000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | {
          message?: string;
          errors?: {
            fieldErrors?: Record<string, string[] | undefined>;
            formErrors?: string[];
          };
        }
      | null;

    const fieldErrors = errorBody?.errors?.fieldErrors
      ? Object.entries(errorBody.errors.fieldErrors)
          .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`))
          .join(", ")
      : "";
    const formErrors = errorBody?.errors?.formErrors?.join(", ") ?? "";
    const details = [fieldErrors, formErrors].filter(Boolean).join(", ");
    const message = errorBody?.message || `Request failed: ${response.status}`;

    throw new Error(details ? `${message} (${details})` : message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
