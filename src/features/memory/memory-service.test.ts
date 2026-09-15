import { beforeEach, describe, expect, it, vi } from "vitest";
const tx = vi.hoisted(() => ({ memory: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() }, auditLog: { create: vi.fn() }, memoryVersion: { create: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } }));
import { createMemory, setMemoryStatus, updateMemory } from "./memory-service";
describe("controle das memórias", () => {
  beforeEach(() => vi.clearAllMocks());
  it("preserva o bloqueio ao editar", async () => {
    tx.memory.findFirst.mockResolvedValue({ id: "m1", content: "Antes", summary: null, status: "BLOCKED" });
    await updateMemory({ userId: "u1", memoryId: "m1", content: "Depois" });
    expect(tx.memory.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: "Depois", status: "BLOCKED" }) }));
    expect(tx.memoryVersion.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ content: "Antes", status: "BLOCKED" }) }));
  });
  it("restringe edição ao dono e exclui memórias apagadas", async () => {
    tx.memory.findFirst.mockResolvedValue(null);
    await expect(updateMemory({ userId: "outro", memoryId: "m1", content: "Depois" })).rejects.toThrow("Memória não encontrada");
    expect(tx.memory.findFirst).toHaveBeenCalledWith({ where: { id: "m1", userId: "outro", status: { not: "DELETED" } } });
    expect(tx.memory.update).not.toHaveBeenCalled();
  });
  it("registra o estado anterior ao desbloquear", async () => {
    tx.memory.findFirst.mockResolvedValue({ content: "Conteúdo", summary: null, status: "BLOCKED" });
    await setMemoryStatus("u1", "m1", "ACTIVE");
    expect(tx.memoryVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "BLOCKED", reason: "Desbloqueada pelo usuário" }) });
    expect(tx.memory.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { status: "ACTIVE", validUntil: null } });
  });
});

it("records creation without copying memory contents to audit logs", async () => {
  tx.memory.create.mockResolvedValue({ id: "m1" });
  await createMemory({ userId: "u1", content: "Private memory", classification: "FACT" });
  expect(tx.auditLog.create).toHaveBeenLastCalledWith({ data: { userId: "u1", entityId: "m1", entityType: "memory", action: "MEMORY_CREATED" } });
});
it("propagates audit failure so the transaction cannot commit silently", async () => {
  tx.memory.create.mockResolvedValue({ id: "m1" });
  tx.auditLog.create.mockRejectedValueOnce(new Error("Audit unavailable"));
  await expect(createMemory({ userId: "u1", content: "Private memory", classification: "FACT" })).rejects.toThrow("Audit unavailable");
});
