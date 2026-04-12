import { ActiveJobsProvider } from "../../service/jobs/providers/activeJobs.provider.js";

async function testRealActiveJobsAPI() {
  console.log("Testing ActiveJobsProvider (Real API)...\n");

  try {
    const provider = new ActiveJobsProvider();
    console.log("Provider initialized with real credentials\n");

    console.log("Fetching jobs from real Active Jobs API...");
    const jobs = await provider.fetchJobs({
      offset: 0,
      titleFilter: '"Data Engineer"',
      locationFilter: '"United States" OR "United Kingdom"',
      descriptionType: "text",
      limit: 5,
    });
    console.log(`Fetched ${jobs.length} jobs\n`);

    if (jobs.length > 0) {
      console.log("First job (raw data):");
      console.log(JSON.stringify(jobs[0], null, 2));
      console.log(`\nTotal jobs fetched: ${jobs.length}`);
    } else {
      console.log("No jobs returned from Active Jobs API");
    }

    console.log("\nReal API test completed");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testRealActiveJobsAPI();