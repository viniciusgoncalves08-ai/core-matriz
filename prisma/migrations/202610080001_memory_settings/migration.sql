CREATE TABLE "UserSettings" (
 "userId" TEXT NOT NULL,
 "autoMemory" BOOLEAN NOT NULL DEFAULT false,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
