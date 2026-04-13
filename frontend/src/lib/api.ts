const DEFAULT_API_BASE_URL = "http://localhost:3000";

const withProtocolIfMissing = (value: string): string => {
	if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
		return value;
	}

	return `http://${value}`;
};

const normalizeApiBaseUrl = (rawBaseUrl: string): string => {
	const trimmed = rawBaseUrl.trim();
	if (!trimmed) {
		return DEFAULT_API_BASE_URL;
	}

	const baseWithoutTrailingSlash = withProtocolIfMissing(trimmed).replace(/\/+$/, "");

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
		return DEFAULT_API_BASE_URL;
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

	try {
		return new URL(normalizedEndpoint, `${API_BASE_URL}/`).toString();
	} catch {
		return `/${normalizedEndpoint}`;
	}
};