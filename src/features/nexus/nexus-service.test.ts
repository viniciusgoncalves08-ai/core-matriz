import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findConversation: vi.fn(), history: vi.fn(), createMessage: vi.fn(), generate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { conversation: { findFirst: mocks.findConversation, update: vi.fn() }, message: { findMany: mocks.history, create: mocks.createMessage }, auditLog: { create: vi.fn() } } }));
vi.mock("@/features/context/context-engine", () => ({ buildContext: vi.fn().mockResolvedValue({}), serializeContext: () => "" }));
vi.mock("@/ai/model-router", () => ({ modelRouter: { generate: mocks.generate } }));
import { respondAsNexus } from "./nexus-service";
describe("continuidade do Nexus", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.generate.mockResolvedValue({ text: "Resposta", model: "test", provider: "test" }); });
  it("envia o histórico na ordem cronológica antes da nova mensagem", async () => {
    mocks.findConversation.mockResolvedValue({ id: "c1" });
    mocks.history.mockResolvedValue([{ role: "assistant", content: "Olá, Ana" }, { role: "user", content: "Sou Ana" }]);
    await respondAsNexus({ userId: "u1", conversationId: "c1", message: "Qual meu nome?" });
    const messages = mocks.generate.mock.calls[0][0].messages;
    expect(messages.slice(2)).toEqual([{ role: "user", content: "Sou Ana" }, { role: "assistant", content: "Olá, Ana" }, { role: "user", content: "Qual meu nome?" }]);
    expect(mocks.history).toHaveBeenCalledWith(expect.objectContaining({ where: { conversationId: "c1", role: { in: ["user", "assistant"] } }, take: 30 }));
  });
  it("não recupera mensagens nem chama IA para conversa de outro usuário", async () => {
    mocks.findConversation.mockResolvedValue(null);
    await expect(respondAsNexus({ userId: "u2", conversationId: "c1", message: "Olá" })).rejects.toThrow("sem permissão");
    expect(mocks.findConversation).toHaveBeenCalledWith({ where: { id: "c1", userId: "u2" }, select: { id: true } });
    expect(mocks.history).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
