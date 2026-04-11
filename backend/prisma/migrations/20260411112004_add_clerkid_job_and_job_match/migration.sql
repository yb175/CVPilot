/*
  Warnings:

  - Made the column `clerkId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "clerkId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Job" (
    "job_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "skills" TEXT[],
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "Job_match" (
    "userId" INTEGER NOT NULL,
    "jobId" TEXT NOT NULL,
    "score" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "Job_match_pkey" PRIMARY KEY ("userId","jobId")
);

-- CreateIndex
CREATE INDEX "Job_source_idx" ON "Job"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Job_externalId_source_key" ON "Job"("externalId", "source");

-- CreateIndex
CREATE INDEX "Job_match_userId_idx" ON "Job_match"("userId");

-- CreateIndex
CREATE INDEX "Job_match_jobId_idx" ON "Job_match"("jobId");

-- AddForeignKey
ALTER TABLE "Job_match" ADD CONSTRAINT "Job_match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job_match" ADD CONSTRAINT "Job_match_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;
