const DEFAULT_API_BASE_URL = "http://localhost:3000";

const normalizeApiBaseUrl = (rawBaseUrl: string): string => {
	const baseWithoutTrailingSlash = rawBaseUrl.replace(/\/+$/, "");

	try {
		const parsed = new URL(baseWithoutTrailingSlash);
		const duplicatedHostPrefix = `/${parsed.hostname}`;

		// Handle accidental base URLs like http://host/host/api
		if (
			parsed.pathname === duplicatedHostPrefix ||
			parsed.pathname.startsWith(`${duplicatedHostPrefix}/`)
		) {
			parsed.pathname = parsed.pathname.slice(duplicatedHostPrefix.length) || "/";
		}

		parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
		return `${parsed.origin}${parsed.pathname === "/" ? "" : parsed.pathname}`;
	} catch {
		return baseWithoutTrailingSlash;
	}
};

export const API_BASE_URL = normalizeApiBaseUrl(
	import.meta.env.VITE_BACKEND_URL ?? DEFAULT_API_BASE_URL
);

export const buildApiUrl = (endpoint: string): string => {
	if (/^https?:\/\//i.test(endpoint)) {
		return endpoint;
	}

	const normalizedEndpoint = endpoint.replace(/^\/+/, "");
	return new URL(normalizedEndpoint, `${API_BASE_URL}/`).toString();
};