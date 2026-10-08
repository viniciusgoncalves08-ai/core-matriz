import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getMemorySettings, saveMemorySettings, memorySettingsInput } from "./memory-settings-service";
it("rejects invalid values and owner injection",()=>{expect(memorySettingsInput.safeParse({autoMemory:"true"}).success).toBe(false);expect(memorySettingsInput.safeParse({autoMemory:true,userId:"other"}).success).toBe(false);});
describe.skipIf(process.env.ACTION_DB_TESTS!=="true")("persistent memory settings",()=>{
 let userId:string;
 beforeAll(async()=>{const url=new URL(process.env.DATABASE_URL!);if(!["localhost","127.0.0.1"].includes(url.hostname)||url.pathname!=="/core_matriz")throw new Error("Isolated database required");userId=(await db.user.create({data:{email:`settings-${crypto.randomUUID()}@example.invalid`}})).id;});
 afterAll(async()=>{if(userId)await db.user.delete({where:{id:userId}});await db.$disconnect();});
 it("defaults off, persists changes and isolates owners",async()=>{
 expect(await getMemorySettings(userId)).toEqual({autoMemory:false});
 await saveMemorySettings(userId,{autoMemory:true});expect(await getMemorySettings(userId)).toEqual({autoMemory:true});expect(await getMemorySettings("other")).toEqual({autoMemory:false});
 await saveMemorySettings(userId,{autoMemory:false});expect(await getMemorySettings(userId)).toEqual({autoMemory:false});
 expect(await db.auditLog.count({where:{userId,action:"MEMORY_SETTINGS_UPDATED"}})).toBe(2);
 });
});
