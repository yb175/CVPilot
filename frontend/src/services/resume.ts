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