import "dotenv/config.js";
import { JobProvider, RawJob } from "./jobProvider.interface.js";

export class AdzunaProvider implements JobProvider {
  private appId: string;
  private appKey: string;
  private baseUrl = "https://api.adzuna.com/v1/api/jobs";
  private country: string;

  constructor(appId?: string, appKey?: string, country: string = "us") {
    this.appId = appId || process.env.ADZUNA_APP_ID || "";
    this.appKey = appKey || process.env.ADZUNA_APP_KEY || "";
    this.country = country;

    if (!this.appId || !this.appKey) {
      throw new Error(
        "Missing ADZUNA_APP_ID or ADZUNA_APP_KEY environment variables"
      );
    }
  }

  async fetchJobs(): Promise<RawJob[]> {
    try {
      // Fetch only 5 jobs
      const url = `${this.baseUrl}/${this.country}/search/1?app_id=${this.appId}&app_key=${this.appKey}&results_per_page=5`;

      console.log(`📍 API URL: ${url.replace(this.appKey, "***")}`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`API Response: ${errorData}`);
        throw new Error(
          `Adzuna API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as any;
      const results = Array.isArray(data.results) ? data.results : [];

      console.log(`📊 API returned ${results.length} results`);

      // Return max 5 raw jobs - NO transformation
      return results.slice(0, 5).map((job: any) => ({
        externalId: String(job.id),
        source: "adzuna",
        rawData: job,
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch jobs from Adzuna: ${error.message}`);
      }
      throw new Error("Failed to fetch jobs from Adzuna: Unknown error");
    }
  }
}