import "dotenv/config.js";
import {
  JobProvider,
  RawJob,
  type JobFetchParams,
} from "./jobProvider.interface.js";
import https from "node:https";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface ActiveJobsResponseItem {
  id?: string | number;
  job_id?: string | number;
  slug?: string;
  title?: string;
  [key: string]: unknown;
}

export class ActiveJobsProvider implements JobProvider {
  private apiKey: string;
  private host: string;
  private baseUrl = "https://active-jobs-db.p.rapidapi.com/active-ats-7d";

  constructor(apiKey?: string, host?: string) {
    this.apiKey = apiKey || process.env.RAPIDAPI_KEY || "";
    this.host = host || process.env.RAPIDAPI_HOST || "active-jobs-db.p.rapidapi.com";

    if (!this.apiKey) {
      throw new Error("Missing RAPIDAPI_KEY environment variable");
    }
  }

  async fetchJobs(params?: JobFetchParams): Promise<RawJob[]> {
    const limit = params?.limit ?? 5;

    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(params?.offset ?? 0),
      title_filter: params?.titleFilter || '"Software Engineer"',
      location_filter: params?.locationFilter || '"United States" OR "United Kingdom"',
      description_type: params?.descriptionType || "text",
    });

    const requestUrl = `${this.baseUrl}?${query.toString()}`;

    const headers = {
      "x-rapidapi-key": this.apiKey,
      "x-rapidapi-host": this.host,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "CVPilot/1.0",
    };

    const data = await this.fetchWithFallbacks(requestUrl, headers);
    this.throwIfApiErrorPayload(data);
    const items = this.toArray(data);

    return items.slice(0, limit).map((item, index) => {
      const externalId = this.pickExternalId(item, index);

      return {
        externalId,
        source: "active_jobs_db",
        rawData: item as Record<string, unknown>,
      };
    });
  }

  private async fetchWithFallbacks(
    requestUrl: string,
    headers: Record<string, string>
  ): Promise<unknown> {
    try {
      return await this.fetchWithRetry(requestUrl, headers);
    } catch (fetchError) {
      try {
        return await this.fetchViaHttps(requestUrl, headers);
      } catch (httpsError) {
        try {
          return await this.fetchViaCurl(requestUrl, headers);
        } catch (curlError) {
          const fetchMsg = this.errorMessage(fetchError);
          const httpsMsg = this.errorMessage(httpsError);
          const curlMsg = this.errorMessage(curlError);
          throw new Error(
            `Failed to fetch jobs from Active Jobs API: fetch=${fetchMsg}; httpsFallback=${httpsMsg}; curlFallback=${curlMsg}`
          );
        }
      }
    }
  }

  private async fetchWithRetry(
    requestUrl: string,
    headers: Record<string, string>
  ): Promise<unknown> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(requestUrl, {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const body = await response.text();
          throw new Error(
            `Active Jobs API error: ${response.status} ${response.statusText}; body=${body.slice(0, 300)}`
          );
        }

        return (await response.json()) as unknown;
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Unknown fetch error");
  }

  private async fetchViaHttps(
    requestUrl: string,
    headers: Record<string, string>
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const req = https.get(
        requestUrl,
        {
          timeout: 15000,
          headers,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          res.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf8");

            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              reject(
                new Error(
                  `Active Jobs API error: ${res.statusCode || "unknown"}; body=${body.slice(0, 300)}`
                )
              );
              return;
            }

            try {
              resolve(JSON.parse(body) as unknown);
            } catch (error) {
              reject(
                new Error(
                  `Invalid JSON from Active Jobs https fallback: ${this.errorMessage(error)}`
                )
              );
            }
          });
        }
      );

      req.on("timeout", () => {
        req.destroy(new Error("HTTPS fallback timeout"));
      });

      req.on("error", (error) => reject(error));
    });
  }

  private async fetchViaCurl(
    requestUrl: string,
    headers: Record<string, string>
  ): Promise<unknown> {
    const args = [
      "-sS",
      "-m",
      "20",
      "-H",
      `x-rapidapi-key: ${headers["x-rapidapi-key"]}`,
      "-H",
      `x-rapidapi-host: ${headers["x-rapidapi-host"]}`,
      "-H",
      "Accept: application/json",
      requestUrl,
    ];

    const { stdout } = await execFileAsync("curl", args, {
      maxBuffer: 1024 * 1024,
    });

    if (!stdout || !stdout.trim()) {
      throw new Error("curl returned empty response");
    }

    try {
      return JSON.parse(stdout) as unknown;
    } catch {
      // Some RapidAPI errors are plain text/partial JSON fragments; surface raw body.
      throw new Error(`Active Jobs API non-JSON response: ${stdout.slice(0, 300)}`);
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      const cause = (error as Error & { cause?: unknown }).cause;
      if (cause instanceof Error) {
        return `${error.message}; cause=${cause.message}`;
      }

      return error.message || "Unknown error";
    }

    return "Unknown error";
  }

  private throwIfApiErrorPayload(payload: unknown): void {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return;
    }

    const obj = payload as Record<string, unknown>;
    const message = typeof obj.message === "string" ? obj.message : null;
    const error = typeof obj.error === "string" ? obj.error : null;

    if (!message && !error) {
      return;
    }

    const hasDataArray =
      Array.isArray(obj.data) ||
      Array.isArray(obj.results) ||
      Array.isArray(obj.jobs) ||
      Array.isArray(obj.items);

    if (!hasDataArray) {
      throw new Error(`Active Jobs API error payload: ${(message || error || "Unknown API error").slice(0, 300)}`);
    }
  }

  private toArray(payload: unknown): ActiveJobsResponseItem[] {
    if (Array.isArray(payload)) {
      return payload as ActiveJobsResponseItem[];
    }

    if (payload && typeof payload === "object") {
      const obj = payload as Record<string, unknown>;
      const candidates = ["data", "results", "jobs", "items"];

      for (const key of candidates) {
        const value = obj[key];
        if (Array.isArray(value)) {
          return value as ActiveJobsResponseItem[];
        }
      }
    }

    return [];
  }

  private pickExternalId(item: ActiveJobsResponseItem, index: number): string {
    const idValue = item.id ?? item.job_id ?? item.slug;

    if (idValue !== undefined && idValue !== null && String(idValue).trim().length > 0) {
      return String(idValue);
    }

    const title = typeof item.title === "string" ? item.title.trim() : "job";
    return `${title}-${index}`;
  }
}