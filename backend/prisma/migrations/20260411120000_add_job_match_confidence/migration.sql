-- AddColumn confidence and timestamps to Job_match
ALTER TABLE "Job_match" 
ADD COLUMN "confidence" DOUBLE PRECISION,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert score from TEXT to DOUBLE PRECISION
-- Using CAST with error handling for invalid values
ALTER TABLE "Job_match" 
ALTER COLUMN "score" TYPE DOUBLE PRECISION 
USING CASE 
  WHEN "score" ~ '^[0-9]+\.?[0-9]*$' THEN CAST("score" AS DOUBLE PRECISION)
  ELSE 0
END;


