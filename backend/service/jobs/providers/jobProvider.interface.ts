export interface RawJob {
  externalId: string;
  source: string;
  rawData: Record<string, unknown>;
}

export interface JobProvider {
  fetchJobs(): Promise<RawJob[]>;
}