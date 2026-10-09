import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { buildContext, serializeContext } from "@/features/context/context-engine";
import { getProjectHub } from "./project-context-service";
import { getProjectLink, changeProjectLink, createProjectConversation, ProjectLinkNotFound, ProjectLinkConflict } from "./project-link-service";
describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("connected project context on isolated Postgres", () => {
  let userId: string, other: string, projectId: string, otherProject: string, conversationId: string, source: string, memoryId: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/core_matriz") throw new Error("Only isolated CI database allowed");
    userId = (await db.user.create({ data: { email: `context-${crypto.randomUUID()}@example.invalid` } })).id;
    other = (await db.user.create({ data: { email: `context-other-${crypto.randomUUID()}@example.invalid` } })).id;
    projectId = (await db.project.create({ data: { userId, name: "Loja", description: "Projeto relacionado" } })).id;
    otherProject = (await db.project.create({ data: { userId: other, name: "Segredo externo" } })).id;
    conversationId = (await createProjectConversation(userId, "Planejamento", projectId)).id;
    source = (await createProjectConversation(userId, "Decisões anteriores", projectId)).id;
    await db.message.createMany({ data: [
      { conversationId: source, role: "user", content: "O fornecedor entrega às sextas" },
      { conversationId: source, role: "assistant", content: "Afirmação antiga da IA não deve ser recuperada" },
      { conversationId, role: "user", content: "Mensagem atual excluída do recall" },
    ] });
    memoryId = (await db.memory.create({ data: { userId, projectId, content: "Priorizar estoque local", classification: "DECISION" } })).id;
    for (const status of ["BLOCKED", "DELETED", "SUPERSEDED"] as const) {
      const c = await db.conversation.create({ data: { userId, projectId, messages: { create: { role: "user", content: `Origem restrita ${status}` } } } });
      await db.memory.create({ data: { userId, projectId, conversationId: c.id, content: `Restrita ${status}`, classification: "CONTEXT", status } });
    }
    const expired = await db.conversation.create({ data: { userId, projectId, messages: { create: { role: "user", content: "Origem vencida" } } } });
    await db.memory.create({ data: { userId, projectId, conversationId: expired.id, content: "Memória vencida", classification: "CONTEXT", validUntil: new Date("2000-01-01") } });
    await db.memory.create({ data: { userId, projectId, content: "Memória futura", classification: "CONTEXT", validFrom: new Date("2100-01-01") } });
    await db.memory.create({ data: { userId: other, projectId, content: "Memória de outra conta", classification: "CONTEXT" } });
    await db.task.createMany({ data: [
      { userId, projectId, title: "Ligar", status: "TODO" }, { userId, projectId, title: "Terminado", status: "COMPLETED" },
      { userId, title: "Sem projeto", status: "TODO" }, { userId: other, projectId, title: "Tarefa de outra conta", status: "TODO" },
    ] });
    await db.goal.create({ data: { userId, projectId, title: "Expandir", progress: 30 } });
  });
  afterAll(async () => { for (const id of [userId, other]) if (id) await db.user.delete({ where: { id } }); await db.$disconnect(); });
  it("uses relationships for a short follow-up, preserving counts, privacy, validity and budget", async () => {
    const context = await buildContext(userId, "E agora?", { projectId, conversationId });
    expect(context.memories.map(m => m.id)).toEqual([memoryId]);
    expect(context.tasks.map(t => t.title)).toEqual(["Ligar"]);
    expect(context.goals?.[0]).toMatchObject({ title: "Expandir", progress: 30 });
    expect(context.conversations?.map(c => c.conversationId)).toEqual([source]);
    expect(context.projectScope?.totals).toMatchObject({ tasks: 2, openTasks: 1, goals: 1, memories: 1 });
    const serialized = serializeContext(context);
    expect(serialized.length).toBeLessThanOrEqual(12000);
    expect(serialized).not.toMatch(/outra conta|restrita|vencida|futura|Mensagem atual|Afirmação antiga|Sem projeto/);
    await expect(buildContext(other, "E agora?", { projectId })).rejects.toBeInstanceOf(ProjectLinkNotFound);
  });
  it("rejects foreign link targets and projects, and never unblocks a linked memory", async () => {
    await expect(getProjectLink(other, { kind: "conversation", id: conversationId })).rejects.toBeInstanceOf(ProjectLinkNotFound);
    await expect(changeProjectLink(userId, { kind: "memory", id: memoryId, projectId: otherProject, expectedProjectId: projectId })).rejects.toBeInstanceOf(ProjectLinkNotFound);
    await expect(createProjectConversation(userId, "Inválida", otherProject)).rejects.toBeInstanceOf(ProjectLinkNotFound);
    const blocked = await db.memory.findFirstOrThrow({ where: { userId, status: "BLOCKED" } });
    await changeProjectLink(userId, { kind: "memory", id: blocked.id, expectedProjectId: projectId, projectId: null });
    expect((await db.memory.findUniqueOrThrow({ where: { id: blocked.id } })).status).toBe("BLOCKED");
    const deleted = await db.memory.findFirstOrThrow({ where: { userId, status: "DELETED" } });
    await expect(changeProjectLink(userId, { kind: "memory", id: deleted.id, expectedProjectId: projectId, projectId: null })).rejects.toBeInstanceOf(ProjectLinkNotFound);
  });
  it("refreshes context and hub after unlinking and detects stale changes", async () => {
    const before = await getProjectHub(userId, projectId);
    expect(before.memories.some(m => m.id === memoryId)).toBe(true);
    expect(before.memories.every(m => m.status !== "DELETED")).toBe(true);
    await changeProjectLink(userId, { kind: "memory", id: memoryId, expectedProjectId: projectId, projectId: null });
    expect((await buildContext(userId, "E agora?", { projectId, conversationId })).memories).toEqual([]);
    expect((await getProjectHub(userId, projectId)).memories.some(m => m.id === memoryId)).toBe(false);
    await expect(changeProjectLink(userId, { kind: "memory", id: memoryId, expectedProjectId: projectId, projectId: null })).rejects.toBeInstanceOf(ProjectLinkConflict);
    expect(await db.auditLog.count({ where: { userId, action: "PROJECT_LINK_CHANGED", entityId: memoryId } })).toBe(1);
    const projects = (await getProjectLink(userId, { kind: "conversation", id: conversationId })).projects;
    expect(projects.some(p => p.id === otherProject)).toBe(false);
  });
  it("allows only one of two simultaneous conflicting links", async () => {
    const c = await createProjectConversation(userId, "Concorrente", null);
    const second = await db.project.create({ data: { userId, name: "Alternativa" } });
    const changes = await Promise.allSettled([projectId, second.id].map(id => changeProjectLink(userId, { kind: "conversation", id: c.id, expectedProjectId: null, projectId: id })));
    expect(changes.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(changes.filter(r => r.status === "rejected")).toHaveLength(1);
    expect(await db.auditLog.count({ where: { userId, entityId: c.id, action: "PROJECT_LINK_CHANGED" } })).toBe(1);
  });
  it("deleting a project preserves linked conversations and memories", async () => {
    const p = await db.project.create({ data: { userId, name: "Temporário" } });
    const c = await createProjectConversation(userId, "Preservada", p.id);
    const m = await db.memory.create({ data: { userId, projectId: p.id, content: "Preservada", classification: "FACT" } });
    await db.project.delete({ where: { id: p.id } });
    expect((await db.conversation.findUniqueOrThrow({ where: { id: c.id } })).projectId).toBeNull();
    expect((await db.memory.findUniqueOrThrow({ where: { id: m.id } })).projectId).toBeNull();
  });
});
