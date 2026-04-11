// src/lib/fetcher.ts

import { useAuth } from "@clerk/react";
import { API_BASE_URL } from "./api";

export const useApi = () => {
  const { getToken } = useAuth();

  const fetchWithAuth = async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const token = await getToken();

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    // ✅ Handle 404 separately (important for preferences)
    if (res.status === 404) {
      return res; // don't throw
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Request failed");
    }

    return res;
  };

  return { fetchWithAuth };
};