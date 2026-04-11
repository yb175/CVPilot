import { AdzunaProvider } from "../../service/jobs/providers/adzuna.provider.js";

async function testRealAdzunaAPI() {
  console.log("🧪 Testing AdzunaProvider (Real API)...\n");

  try {
    const provider = new AdzunaProvider();
    console.log("✅ Provider initialized with real credentials\n");

    console.log("📡 Fetching jobs from real Adzuna API...");
    const jobs = await provider.fetchJobs();
    console.log(`✅ Fetched ${jobs.length} jobs\n`);

    if (jobs.length > 0) {
      console.log("📋 First job (raw data):");
      console.log(JSON.stringify(jobs[0], null, 2));
      console.log(`\n✅ Total jobs fetched: ${jobs.length}`);
    } else {
      console.log("⚠️  No jobs returned from Adzuna");
    }

    console.log("\n🎉 Real API test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testRealAdzunaAPI();