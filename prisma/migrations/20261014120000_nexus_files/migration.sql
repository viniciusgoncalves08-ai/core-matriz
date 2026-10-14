CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "conversationId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "mime" TEXT NOT NULL, "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL, "bytes" BYTEA NOT NULL, "text" TEXT NOT NULL,
  "pages" JSONB NOT NULL, "pageCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Attachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Attachment_userId_conversationId_sha256_key" ON "Attachment"("userId", "conversationId", "sha256");
CREATE INDEX "Attachment_userId_createdAt_idx" ON "Attachment"("userId", "createdAt");
CREATE INDEX "Attachment_conversationId_idx" ON "Attachment"("conversationId");
