export interface RawJob {
  externalId: string;
  source: string;
  rawData: Record<string, unknown>;
}

export interface JobFetchParams {
  offset?: number;
  titleFilter?: string;
  locationFilter?: string;
  descriptionType?: "text" | "html";
  limit?: number;
}

export interface JobProvider {
  fetchJobs(params?: JobFetchParams): Promise<RawJob[]>;
}