import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { listGoals, saveGoal } from "./goal-service";
import { WorkNotFoundError } from "@/features/projects/work-service";
describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("goals with real Postgres", () => {
 let owner: string, other: string, projectId: string, goalId: string;
 beforeAll(async () => {
  const url=new URL(process.env.DATABASE_URL!);
  if (!["localhost","127.0.0.1"].includes(url.hostname) || url.pathname!=="/core_matriz") throw new Error("Isolated database required");
  owner=(await db.user.create({data:{email:crypto.randomUUID()+"@example.invalid"}})).id;
  other=(await db.user.create({data:{email:crypto.randomUUID()+"@example.invalid"}})).id;
  projectId=(await db.project.create({data:{userId:owner,name:"Test project"}})).id;
 });
 afterAll(async () => {
  for (const id of [owner,other]) if(id) await db.user.delete({where:{id}});
  await db.$disconnect();
 });
 it("persists a goal, its project and audited completion", async () => {
  const goal=await saveGoal(owner,{title:"Goal test",projectId,progress:20,dueAt:"2026-12-25"});
  goalId=goal.id;
  const rows=await listGoals(owner);
  expect(rows[0].project?.id).toBe(projectId);
  expect(rows[0].dueAt?.toISOString()).toBe("2026-12-25T00:00:00.000Z");
  await saveGoal(owner,{status:"completed"},goalId);
  expect((await db.goal.findUniqueOrThrow({where:{id:goalId}})).progress).toBe(100);
  expect(await db.auditLog.count({where:{userId:owner,entityId:goalId}})).toBe(2);
 });
 it("isolates goals and project links between accounts", async () => {
  expect(await listGoals(other)).toEqual([]);
  await expect(saveGoal(other,{title:"Changed"},goalId)).rejects.toBeInstanceOf(WorkNotFoundError);
  await expect(saveGoal(other,{title:"Other goal",projectId})).rejects.toBeInstanceOf(WorkNotFoundError);
  expect(await db.goal.count({where:{userId:other}})).toBe(0);
 });
});
