import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getDeadlineAlerts, markDeadlineAlertRead } from "./alert-service";
describe.skipIf(process.env.ACTION_DB_TESTS!=="true")("deadline alerts with isolated Postgres",()=>{
 let userId:string;let taskId:string;let goalId:string;
 const now=new Date("2026-10-09T12:00:00Z");
 beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL!);
  if(!["localhost","127.0.0.1"].includes(url.hostname)||url.pathname!=="/core_matriz")throw new Error("Only isolated CI database allowed");
  userId=(await db.user.create({data:{email:`alerts-${crypto.randomUUID()}@example.invalid`}})).id;
  taskId=(await db.task.create({data:{userId,title:"Late",status:"TODO",dueAt:new Date("2026-10-07")}})).id;
  goalId=(await db.goal.create({data:{userId,title:"Goal",dueAt:new Date("2026-10-08")}})).id;
  await db.task.createMany({data:[{userId,title:"Today",status:"TODO",dueAt:new Date("2026-10-09")},{userId,title:"Done",status:"COMPLETED",dueAt:new Date("2026-10-07")}]});
 });
 afterAll(async()=>{if(userId)await db.user.delete({where:{id:userId}});await db.$disconnect();});
 it("isolates records, deduplicates read acknowledgements, and respects changing deadlines",async()=>{
  expect((await getDeadlineAlerts(userId,now)).alerts).toHaveLength(2);
  expect((await getDeadlineAlerts("other",now)).alerts).toHaveLength(0);
  const input={kind:"task",id:taskId,dueDate:"2026-10-07"};
  expect(await markDeadlineAlertRead("other",input,now)).toBe(false);
  expect(await markDeadlineAlertRead(userId,{...input,dueDate:"2026-10-06"},now)).toBe(false);
  await Promise.all([markDeadlineAlertRead(userId,input,now),markDeadlineAlertRead(userId,input,now)]);
  expect(await db.deadlineAlertRead.count({where:{userId}})).toBe(1);
  expect(await db.auditLog.count({where:{userId,action:"DEADLINE_ALERT_READ"}})).toBe(1);
  expect((await getDeadlineAlerts(userId,now)).alerts.find(a=>a.id===taskId)?.readAt).toBeTruthy();
  await db.task.update({where:{id:taskId},data:{dueAt:new Date("2026-10-08")}});
  expect((await getDeadlineAlerts(userId,now)).alerts.find(a=>a.id===taskId)?.readAt).toBeNull();
  await db.task.update({where:{id:taskId},data:{status:"COMPLETED"}});
  await db.goal.update({where:{id:goalId},data:{progress:100}});
  expect((await getDeadlineAlerts(userId,now)).alerts).toHaveLength(0);
 });
});
