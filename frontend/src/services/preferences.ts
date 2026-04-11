// CREATE
export const createPreferences = async (
  data: {
    seniority: "INTERN" | "FULLTIME";
    locationPreferences: ("REMOTE" | "ONSITE" | "HYBRID")[];
  },
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
) => {
  const res = await fetchWithAuth("/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
};

// GET
export const getPreferences = async (fetchWithAuth: any) => {
  const res = await fetchWithAuth("/preferences");

  // ✅ Handle 404 properly
  if (res.status === 404) {
    return null;
  }

  return res.json();
};

// UPDATE
export const updatePreferences = async (
  data: {
    seniority?: "INTERN" | "FULLTIME";
    locationPreferences?: ("REMOTE" | "ONSITE" | "HYBRID")[];
  },
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
) => {
  const res = await fetchWithAuth("/preferences", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
};