import { db } from "@/lib/db";
import { WorkNotFoundError } from "@/features/projects/work-service";
import { goalSchema, goalPatchSchema } from "./goal-schema";
export async function listGoals(userId: string) {
  return db.goal.findMany({ where: { userId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], include: { project: { select: { id: true, name: true } } } });
}
export async function saveGoal(userId: string, raw: unknown, id?: string) {
  const input = id ? goalPatchSchema.parse(raw) : goalSchema.parse(raw);
  return db.$transaction(async tx => {
    const previous = id ? await tx.goal.findFirst({ where: { id, userId } }) : null;
    if (id && !previous) throw new WorkNotFoundError();
    if (input.projectId && !await tx.project.findFirst({ where: { id: input.projectId, userId }, select: { id: true } })) throw new WorkNotFoundError();
    const status = input.status ?? previous?.status ?? "active";
    const progress = status === "completed" ? 100 : input.progress ?? previous?.progress ?? 0;
    const data = { ...input, status, progress, ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt + "T00:00:00.000Z") : null } : {}) };
    const goal = id ? await tx.goal.update({ where: { id, userId }, data }) : await tx.goal.create({ data: { ...data, title: input.title!, userId } });
    await tx.auditLog.create({ data: { userId, action: id ? "GOAL_UPDATED" : "GOAL_CREATED", entityType: "goal", entityId: goal.id, metadata: { fields: Object.keys(input), before: previous ? { status: previous.status, progress: previous.progress } : null, after: { status: goal.status, progress: goal.progress } } } });
    return goal;
  }, { isolationLevel: "Serializable" });
}
