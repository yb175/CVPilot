export const uploadResume = async (
  file: File,
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetchWithAuth("/resume", {
    method: "POST",
    body: formData,
  });

  return res.json();
};

/**
 * Check if user has uploaded a resume
 * Returns true if resume exists and is ready (200) or parsing (202)
 * Returns false if no resume (404) or any error occurs
 */
export const checkResumeExists = async (
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
): Promise<boolean> => {
  try {
    const res = await fetchWithAuth("/resume");
    // 200 = resume ready, 202 = parsing in progress, both mean hasResume=true
    return res.status === 200 || res.status === 202;
  } catch (err) {
    // If fetch fails or 404, assume no resume
    console.error("Failed to check resume status:", err);
    return false;
  }
};

/**
 * Fetch the current resume data for the user
 * Returns resume metadata or null if not found
 */
export const getResume = async (
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
) => {
  const res = await fetchWithAuth("/resume");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch resume");
  return res.json();
};