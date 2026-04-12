import type { RawJob } from "./providers/jobProvider.interface.js";
import type { Prisma } from "../../generated/prisma/client.js";

export interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  source: string;
  externalId: string;
  skills: string[];
  rawData: Prisma.InputJsonValue;
}

/**
 * Normalize Active Jobs DB raw job to our schema
 * NO AI, NO transformation - just field mapping
 */
export function normalizeActiveJobsDbJob(rawJob: RawJob): NormalizedJob {
  const raw = rawJob.rawData as any;

  const title =
    firstString(raw.title, raw.job_title, raw.position, raw.role) || "Untitled";
  const company =
    firstString(
      raw.company,
      raw.company_name,
      raw.organization,
      raw.hiring_company,
      raw.employer_name,
      raw.employer
    ) || "Unknown Company";
  const location =
    firstString(
      raw.location,
      raw.location_name,
      raw.city,
      raw.country,
      raw.candidate_required_location,
      raw.remote_location
    ) || "Remote";
  const description =
    firstString(raw.description, raw.description_text, raw.job_description, raw.summary) || "";

  return {
    title,
    company,
    location,
    description,
    source: "active_jobs_db",
    externalId: rawJob.externalId,
    skills: extractSkillsFromText(`${title} ${description}`),
    rawData: raw,
  };
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      const nestedDisplayName = nested.display_name;
      if (typeof nestedDisplayName === "string" && nestedDisplayName.trim().length > 0) {
        return nestedDisplayName;
      }
      const nestedName = nested.name;
      if (typeof nestedName === "string" && nestedName.trim().length > 0) {
        return nestedName;
      }
    }
  }

  return null;
}

/**
 * Extract keywords that might be skills (deterministic heuristic)
 */
function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Python",
    "Java",
    "SQL",
    "PostgreSQL",
    "MongoDB",
    "Docker",
    "Kubernetes",
    "AWS",
    "Azure",
    "Git",
    "REST API",
    "GraphQL",
    "Vue",
    "Angular",
    "Express",
    "Django",
    "Spring",
    "Microservices",
    "CI/CD",
    "Linux",
    "DevOps",
    "C++",
    "C#",
    ".NET",
    "Ruby",
    "Rails",
    "PHP",
    "Laravel",
    "Go",
    "Rust",
    "Kotlin",
    "Swift",
    "Objective-C",
    "HTML",
    "CSS",
    "SASS",
    "Tailwind",
    "Bootstrap",
    "jQuery",
    "Redux",
    "Vue.js",
    "Next.js",
    "Nuxt",
    "Firebase",
    "Elasticsearch",
    "Redis",
    "Kafka",
    "RabbitMQ",
    "Apache",
    "Nginx",
    "Jenkins",
    "GitLab",
    "GitHub",
    "Terraform",
    "Ansible",
    "GCP",
    "Heroku",
    "Machine Learning",
    "AI",
    "Data Science",
    "Deep Learning",
    "TensorFlow",
    "PyTorch",
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  commonSkills.forEach((skill) => {
    if (lowerText.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  });

  return [...new Set(found)]; // Remove duplicates
}