ALTER TABLE "Conversation" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Memory" ADD COLUMN "projectId" TEXT;
CREATE INDEX "Conversation_userId_projectId_idx" ON "Conversation"("userId", "projectId");
CREATE INDEX "Memory_userId_projectId_idx" ON "Memory"("userId", "projectId");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
