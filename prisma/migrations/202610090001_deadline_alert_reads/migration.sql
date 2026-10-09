CREATE TABLE "DeadlineAlertRead" (
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeadlineAlertRead_pkey" PRIMARY KEY ("userId", "key")
);
ALTER TABLE "DeadlineAlertRead" ADD CONSTRAINT "DeadlineAlertRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
