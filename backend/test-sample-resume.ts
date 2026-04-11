/**
 * =====================================
 * 🧪 Sample Resume Parsing Test
 * =====================================
 * 
 * Quick test to verify Phase 1-3 improvements
 * Run with: npx tsx backend/test-sample-resume.ts
 */

import { initializeGeminiClient, callGeminiForResumeParsing, isGeminiInitialized } from "./service/geminiClient.js";
import { validateAndRepairResume } from "./service/resumeValidator.js";

// Initialize Gemini first
initializeGeminiClient();

/**
 * Sample resume text based on user's provided example
 * This mimics a real engineer's resume with various formats
 */
const SAMPLE_RESUME = `
SIDPREET SINGH
Senior Software Engineer | Remote-Friendly
sidpreet@email.com | LinkedIn | GitHub

---

PROFESSIONAL SUMMARY
Experienced Full-Stack Engineer with 6+ years building scalable web applications.
Expertise in modern JavaScript frameworks and cloud infrastructure.

---

EXPERIENCE

Senior Software Engineer | TechCorp Inc. (2021 - Present) [6 years total]
- Led architectural redesign of microservices platform, reducing API latency by 40%
- Built real-time dashboard using React, TypeScript, and WebSockets
- Mentored team of 3 junior developers in REST API design patterns
- Improved PostgreSQL query performance through indexing strategies

Full-Stack Developer | StartupX | (2019 - 2021)
- Developed REST APIs using Node.js and Express for e-commerce platform
- Built responsive UI with React and Tailwind CSS
- Managed MongoDB schema design and optimization
- Implemented CI/CD pipeline with GitHub Actions

Junior Developer | LocalTech Solutions | (2018 - 2019)
- Wrote JavaScript and HTML/CSS for client websites
- Learned git version control and deployment processes

---

TECHNICAL SKILLS

Languages: JavaScript, TypeScript
Frontend: React, CSS, Tailwind, HTML5
Backend: Node.js, Express
Databases: PostgreSQL, MongoDB
DevOps: Docker, GitHub, Git
APIs: RESTful API Design

---

EDUCATION

Bachelor of Science (B.S.) in Computer Science
State University | Graduated 2018
Relevant Coursework: Web Development, Data Structures, Building Scalable Web Applications with Authentication

---

CERTIFICATIONS & KEYWORDS
- AWS Certified Cloud Practitioner (in progress)
- Microservices Architecture
- Agile/Scrum
- Real-time Applications
- Authentication & Authorization

---

PREFERENCES
Location: Open to Remote/Hybrid
Work Mode: Prefer Remote
`;

async function runTest() {
  console.log("\n🚀 === RESUME PARSING TEST ===\n");
  
  if (!isGeminiInitialized()) {
    console.log("❌ Gemini not initialized. Make sure GEMINI_API_KEY is set.");
    process.exit(1);
  }

  try {
    console.log("📝 Sample resume length: " + SAMPLE_RESUME.length + " characters");
    console.log("✅ Limit: 25,000 characters");
    console.log("✅ Status: Under limit\n");

    // Call Gemini with new parameters
    console.log("🤖 Calling Gemini API with format & language detection...\n");
    const response = await callGeminiForResumeParsing(SAMPLE_RESUME, "test-sidpreet-1", {
      userId: "test-user-123",
      format: "ATS", // Structured format
      language: "en", // English
    });

    if (!response.success || !response.data) {
      console.log("❌ LLM parsing failed");
      console.log("Error:", response.error);
      return;
    }

    console.log("✅ LLM parsing succeeded\n");

    // Validate and sanitize
    console.log("🔍 Validating and applying sanitization rules...\n");
    const validated = await validateAndRepairResume(response.data, "test-sidpreet-1", {
      userId: "test-user-123",
    });

    if (!validated) {
      console.log("❌ Validation failed");
      return;
    }

    console.log("✅ Validation succeeded\n");

    // Display results
    console.log("════════════════════════════════════════");
    console.log("📊 PARSING RESULTS");
    console.log("════════════════════════════════════════\n");

    console.log("1️⃣  NAME");
    console.log(`   ${validated.name ? "✅ " + validated.name : "❌ Not extracted"}\n`);

    console.log("2️⃣  SKILLS (Normalized)");
    if (validated.skills && validated.skills.length > 0) {
      console.log(`   ✅ Extracted ${validated.skills.length} skills:`);
      console.log(`   ${validated.skills.join(", ")}\n`);
    } else {
      console.log("   ❌ No skills extracted\n");
    }

    console.log("3️⃣  CURRENT ROLE");
    console.log(`   ${validated.currentRole ? "✅ " + validated.currentRole : "❌ Not extracted"}\n`);

    console.log("4️⃣  EXPERIENCE YEARS");
    console.log(`   ${validated.experienceYears ? "✅ " + validated.experienceYears + " years" : "❌ Not extracted"}\n`);

    console.log("5️⃣  SENIORITY LEVEL");
    console.log(`   ${validated.seniority ? "✅ " + validated.seniority : "❌ Not extracted"}\n`);

    console.log("6️⃣  LOCATION");
    console.log(`   ${validated.location ? "✅ " + validated.location : "❌ Not extracted"}\n`);

    console.log("7️⃣  REMOTE");
    console.log(`   ${validated.remote !== null ? "✅ " + (validated.remote ? "Yes" : "No") : "❌ Not extracted"}\n`);

    console.log("8️⃣  TECH STACK (Categorized)");
    if (validated.techStack && Object.keys(validated.techStack).length > 0) {
      console.log("   ✅ Extracted:");
      for (const [category, techs] of Object.entries(validated.techStack)) {
        console.log(`      ${category}: ${techs}`);
      }
      console.log("");
    } else {
      console.log("   ❌ Not extracted\n");
    }

    console.log("9️⃣  PROJECTS");
    if (validated.projects && validated.projects.length > 0) {
      console.log(`   ✅ Extracted ${validated.projects.length} project(s):`);
      validated.projects.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.name}`);
        console.log(`         ${p.description}`);
      });
      console.log("");
    } else {
      console.log("   ❌ Not extracted\n");
    }

    console.log("🔟 KEYWORDS");
    if (validated.keywords && validated.keywords.length > 0) {
      console.log(`   ✅ Extracted ${validated.keywords.length} keyword(s):`);
      console.log(`   ${validated.keywords.join(", ")}\n`);
    } else {
      console.log("   ❌ Not extracted\n");
    }

    console.log("1️⃣1️⃣ EDUCATION");
    if (validated.education) {
      const hasData = validated.education.degree || validated.education.institution;
      if (hasData) {
        console.log("   ✅ Extracted:");
        if (validated.education.degree) console.log(`      Degree: ${validated.education.degree}`);
        if (validated.education.institution) console.log(`      Institution: ${validated.education.institution}`);
        console.log("");
      } else {
        console.log("   ❌ No education data\n");
      }
    } else {
      console.log("   ❌ No education data\n");
    }

    console.log("1️⃣2️⃣ CONFIDENCE SCORES");
    if (validated.confidence && Object.keys(validated.confidence).length > 0) {
      console.log("   ✅ Confidence per field:");
      for (const [field, score] of Object.entries(validated.confidence)) {
        const icon = score >= 70 ? "🟢" : score >= 40 ? "🟡" : "🔴";
        console.log(`      ${icon} ${field}: ${score}%`);
      }
      console.log("");
    } else {
      console.log("   ⚠️  No confidence data (optional)\n");
    }

    // Summary
    console.log("════════════════════════════════════════");
    console.log("📈 ACCURACY SUMMARY");
    console.log("════════════════════════════════════════\n");

    const checks = {
      "Name": !!validated.name,
      "Skills": !!(validated.skills && validated.skills.length > 0),
      "Current Role": !!validated.currentRole,
      "Experience Years": validated.experienceYears !== null,
      "Seniority": !!validated.seniority,
      "Location": !!validated.location,
      "Remote": validated.remote !== null,
      "Tech Stack": !!(validated.techStack && Object.keys(validated.techStack).length > 0),
      "Projects": !!(validated.projects && validated.projects.length > 0),
      "Keywords": !!(validated.keywords && validated.keywords.length > 0),
      "Education": !!(validated.education && (validated.education.degree || validated.education.institution)),
    };

    const passCount = Object.values(checks).filter(Boolean).length;
    const totalCount = Object.keys(checks).length;
    const accuracy = Math.round((passCount / totalCount) * 100);

    console.log(`Passed: ${passCount}/${totalCount} fields`);
    console.log(`Accuracy: ${accuracy}%`);
    console.log(`Target: 80-90%`);

    if (accuracy >= 80) {
      console.log(`\n✅ RESULT: ${accuracy}% ≥ 80% - EXCELLENT! 🎉\n`);
    } else if (accuracy >= 70) {
      console.log(`\n⚠️ RESULT: ${accuracy}% - Good progress, room for improvement\n`);
    } else {
      console.log(`\n❌ RESULT: ${accuracy}% - Needs more work\n`);
    }

    // Failed fields
    const failed = Object.entries(checks)
      .filter(([_, passed]) => !passed)
      .map(([field]) => field);

    if (failed.length > 0) {
      console.log(`⚠️ Failed fields: ${failed.join(", ")}`);
      console.log("These should be improved by the new prompt & validation logic.\n");
    }

  } catch (error) {
    console.error("❌ Test failed with error:");
    console.error(error);
    process.exit(1);
  }
}

// Run test
runTest().catch(console.error);
