ALTER TABLE "Goal" ADD COLUMN "projectId" TEXT;
CREATE INDEX "Goal_projectId_idx" ON "Goal"("projectId");
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
