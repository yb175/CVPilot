
import prisma from "../../lib/prisma.js";
import  {upsertJob}  from "../../service/jobs/jobs.service.js";
import { upsertJobMatch } from "../../service/jobs/jobMatch.service.js";

async function runTests() {
  console.log("🧪 Starting Job Service Tests...\n");

  try {
    // Setup: Create a test user
    console.log("📝 Setup: Creating test user...");
    const testUser = await prisma.user.create({
      data: {
        clerkId: `clerk_test_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        name: "Test User",
      },
    });
    console.log(`✅ User created: ${testUser.id}\n`);

    // Test 1: Upsert Job
    console.log("TEST 1️⃣  - Upsert Job (Create)");
    const jobData = {
      title: "Senior React Developer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      description: "Build scalable React applications",
      source: "greenhouse",
      externalId: "job_123",
      skills: ["React", "TypeScript", "Node.js"],
      rawData: { posted_date: "2024-04-11", job_type: "full_time" },
    };

    const createdJob = await upsertJob(jobData);
    console.log(`✅ Job created: ${createdJob.job_id}`);
    console.log(`   Title: ${createdJob.title}\n`);

    // Test 2: Upsert Job Match
    console.log("TEST 2️⃣  - Upsert Job Match");
    const jobMatch = await upsertJobMatch(
      testUser.id,
      createdJob.job_id,
      "0.87",
      "Skills match: React, TypeScript expertise aligns with requirements"
    );
    console.log(`✅ Job match created`);
    console.log(`   User: ${jobMatch.userId}, Job: ${jobMatch.jobId}`);
    console.log(`   Score: ${jobMatch.score}\n`);

    // Cleanup
    console.log("🧹 Cleanup: Removing test data...");
    await prisma.job_match.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.job.deleteMany({
      where: { externalId: "job_123" },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log("✅ Cleanup complete\n");

    console.log("🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();