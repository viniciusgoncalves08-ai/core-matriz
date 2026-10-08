import { db } from "@/lib/db";
import { z } from "zod";
export const memorySettingsInput = z.object({ autoMemory: z.boolean() }).strict();
export async function getMemorySettings(userId: string) {
  const settings = await db.userSettings.findUnique({ where: { userId }, select: { autoMemory: true } });
  return { autoMemory: settings?.autoMemory ?? false };
}
export async function saveMemorySettings(userId: string, raw: unknown) {
  const input = memorySettingsInput.parse(raw);
  return db.$transaction(async tx => {
    const settings = await tx.userSettings.upsert({ where: { userId }, create: { userId, ...input }, update: input, select: { autoMemory: true } });
    await tx.auditLog.create({ data: { userId, action: "MEMORY_SETTINGS_UPDATED", entityType: "memory", metadata: input } });
    return settings;
  });
}
