const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  return res;
}

export interface Preferences {
  seniority: "INTERN" | "FULLTIME";
  locationPreferences: Array<"REMOTE" | "ONSITE" | "HYBRID">;
}

export async function fetchPreferences(token: string): Promise<Preferences | null> {
  const res = await apiFetch("/preferences", token);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch preferences");
  return res.json();
}

export async function savePreferences(token: string, data: Preferences): Promise<Preferences> {
  const res = await apiFetch("/preferences", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save preferences");
  return res.json();
}

export async function patchPreferences(
  token: string,
  data: Partial<Preferences>
): Promise<Preferences> {
  const res = await apiFetch("/preferences", token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update preferences");
  return res.json();
}

export interface ResumeData {
  fileUrl: string;
  uploadedAt: string;
  parsedData?: Record<string, unknown> | null;
  message?: string;
}

export async function fetchResume(token: string): Promise<ResumeData | null> {
  const res = await apiFetch("/resume", token);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch resume");
  return res.json();
}

export async function uploadResume(
  token: string,
  file: File
): Promise<{ changed: boolean; fileUrl?: string; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/resume", token, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to upload resume");
  }
  return res.json();
}
