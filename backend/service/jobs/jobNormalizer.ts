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
 * Normalize Adzuna raw job to our schema
 * NO AI, NO transformation - just field mapping
 */
export function normalizeAdzunaJob(rawJob: RawJob): NormalizedJob {
  const raw = rawJob.rawData as any;

  return {
    title: raw.title || "Untitled",
    company: raw.company?.display_name || "Unknown Company",
    location: raw.location?.display_name || "Remote",
    description: raw.description || "",
    source: "adzuna",
    externalId: rawJob.externalId,
    skills: extractSkillsFromText(raw.title + " " + (raw.description || "")),
    rawData: raw,
  };
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