import { db } from "@/lib/db";
import { overviewDay } from "@/features/home/overview-service";
import { z } from "zod";
export const alertReadInput = z.object({ kind: z.enum(["task", "goal"]), id: z.string().min(1).max(100), dueDate: z.string().date() }).strict();
export function alertKey(kind: "task" | "goal", id: string, dueAt: Date) {
  return `${kind}:${id}:${dueAt.toISOString().slice(0, 10)}`;
}
const openTasks = ["INBOX", "TODO", "IN_PROGRESS", "BLOCKED"] as const;
export async function getDeadlineAlerts(userId: string, now = new Date()) {
  const today = overviewDay(now);
  const [tasks, goals] = await Promise.all([
    db.task.findMany({ where: { userId, status: { in: [...openTasks] }, dueAt: { lt: today } }, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take: 101, select: { id: true, title: true, dueAt: true } }),
    db.goal.findMany({ where: { userId, status: "active", progress: { lt: 100 }, dueAt: { lt: today } }, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take: 101, select: { id: true, title: true, dueAt: true } }),
  ]);
  const records = [ ...tasks.slice(0,100).map(t => ({ ...t, kind: "task" as const })), ...goals.slice(0,100).map(g => ({ ...g, kind: "goal" as const })) ].map(item => ({ key: alertKey(item.kind,item.id,item.dueAt!), kind: item.kind, id: item.id, title: item.title, dueDate: item.dueAt!.toISOString().slice(0,10) })).sort((a,b) => a.dueDate.localeCompare(b.dueDate) || a.key.localeCompare(b.key));
  const receipts = records.length ? await db.deadlineAlertRead.findMany({ where: { userId, key: { in: records.map(r=>r.key) } }, select: { key: true, readAt: true } }) : [];
  const read = new Map(receipts.map(r=>[r.key,r.readAt.toISOString()]));
  return { alerts: records.map(r=>({...r,readAt:read.get(r.key)??null})), truncated: tasks.length>100||goals.length>100, checkedAt:now.toISOString() };
}
export async function markDeadlineAlertRead(userId: string, raw: unknown, now = new Date()) {
  const input = alertReadInput.parse(raw);
  return db.$transaction(async tx => {
    const record = input.kind === "task"
      ? await tx.task.findFirst({ where: { id:input.id,userId,status:{in:[...openTasks]},dueAt:{lt:overviewDay(now)} },select:{id:true,dueAt:true} })
      : await tx.goal.findFirst({ where: { id:input.id,userId,status:"active",progress:{lt:100},dueAt:{lt:overviewDay(now)} },select:{id:true,dueAt:true} });
    if (!record?.dueAt || record.dueAt.toISOString().slice(0,10)!==input.dueDate) return false;
    const key = alertKey(input.kind, record.id,record.dueAt);
    const created = await tx.deadlineAlertRead.createMany({ data:[{userId,key}], skipDuplicates:true });
    if (created.count) await tx.auditLog.create({data:{userId,action:"DEADLINE_ALERT_READ",entityType:input.kind,entityId:record.id,metadata:{dueDate:input.dueDate}}});
    return true;
  });
}
