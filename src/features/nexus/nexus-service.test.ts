import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ proposeProject: vi.fn(), proposeTask: vi.fn(), findAgent: vi.fn(), findConversation: vi.fn(), history: vi.fn(), createMessage: vi.fn(), generate: vi.fn(), stream: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: async (action: (tx: unknown) => unknown) => action({ message: { create: mocks.createMessage }, conversation: { update: vi.fn() }, auditLog: { create: vi.fn() } }), agent: { findFirst: mocks.findAgent }, conversation: { findFirst: mocks.findConversation, update: vi.fn() }, message: { findMany: mocks.history, create: mocks.createMessage }, auditLog: { create: vi.fn() } } }));
vi.mock("@/features/context/context-engine", () => ({ buildContext: vi.fn().mockResolvedValue({}), serializeContext: () => "" }));
vi.mock("@/ai/model-router", () => ({ modelRouter: { generate: mocks.generate, stream: mocks.stream } }));
vi.mock("@/features/actions/action-service", () => ({ proposeProject: mocks.proposeProject, proposeTask: mocks.proposeTask }));
import { respondAsNexus } from "./nexus-service";
describe("continuidade do Nexus", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.findAgent.mockResolvedValue(null); mocks.generate.mockResolvedValue({ text: "Resposta", model: "test", provider: "test" }); });
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

it("refuses agents owned by another user before retrieving history", async () => {
  mocks.findConversation.mockResolvedValue({ id: "c1" });
  mocks.findAgent.mockResolvedValue(null);
  mocks.history.mockClear();
  await expect(respondAsNexus({ userId: "u1", conversationId: "c1", message: "Olá", agentId: "other" })).rejects.toThrow("Agente não encontrado");
  expect(mocks.findAgent).toHaveBeenLastCalledWith({ where: { id: "other", userId: "u1" } });
  expect(mocks.history).not.toHaveBeenCalled();
});
it("refuses paused agents before calling the model", async () => {
  mocks.findConversation.mockResolvedValue({ id: "c1" });
  mocks.findAgent.mockResolvedValue({ status: "PAUSED" });
  mocks.generate.mockClear();
  await expect(respondAsNexus({ userId: "u1", conversationId: "c1", message: "Olá", agentId: "a1" })).rejects.toThrow("pausado");
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("applies the selected agent configuration and persists identity", async () => {
  mocks.findConversation.mockResolvedValue({ id: "c1" });
  mocks.findAgent.mockResolvedValue({ id: "a1", name: "Planejador", role: "Projetos", systemPrompt: "Organize próximos passos", preferredModel: "test-model", temperature: 0.4, status: "ACTIVE" });
  mocks.history.mockResolvedValue([]);
  mocks.generate.mockResolvedValue({ text: "Plano", provider: "test", model: "test-model" });
  await respondAsNexus({ userId: "u1", conversationId: "c1", message: "Planeje", agentId: "a1" });
  const [input, targets] = mocks.generate.mock.calls.at(-1)!;
  expect(input.messages[0].content).toContain("Organize próximos passos");
  expect(input.temperature).toBe(0.4);
  expect(targets[0].model).toBe("test-model");
  expect(mocks.createMessage).toHaveBeenLastCalledWith({ data: expect.objectContaining({ metadata: expect.objectContaining({ agentId: "a1", agentName: "Planejador" }) }) });
});

afterEach(() => vi.unstubAllEnvs());
it("uses OpenAI when provider environment variable is blank", async () => {
  vi.stubEnv("AI_DEFAULT_PROVIDER", "  ");
  vi.stubEnv("AI_DEFAULT_MODEL", "");
  mocks.findConversation.mockResolvedValue({ id: "c1" });
  mocks.findAgent.mockResolvedValue(null);
  mocks.history.mockResolvedValue([]);
  mocks.generate.mockResolvedValue({ text: "OK", provider: "openai", model: "gpt-5" });
  await respondAsNexus({ userId: "u1", conversationId: "c1", message: "Olá" });
  expect(mocks.generate.mock.calls.at(-1)![1]).toEqual([{ provider: "openai", model: "gpt-5" }]);
});

it("persists a streaming answer only after the model completes", async () => {
  mocks.findConversation.mockResolvedValue({ id: "c1" }); mocks.findAgent.mockResolvedValue(null); mocks.history.mockResolvedValue([]); mocks.createMessage.mockClear();
  const emit = vi.fn();
  mocks.stream.mockImplementationOnce(async (_input, _targets, onDelta) => {
    onDelta("Olá");
    expect(mocks.createMessage.mock.calls.filter(([args]) => args.data.role === "assistant")).toHaveLength(0);
    return { text: "Olá", provider: "gemini", model: "test" };
  });
  await respondAsNexus({ userId: "u1", conversationId: "c1", message: "Oi", onDelta: emit });
  expect(emit).toHaveBeenCalledWith("Olá");
  expect(mocks.createMessage).toHaveBeenLastCalledWith({ data: expect.objectContaining({ role: "assistant", content: "Olá" }) });
});
it("does not persist a partial assistant response when the stream fails", async () => {
  mocks.findConversation.mockResolvedValue({ id: "c1" }); mocks.findAgent.mockResolvedValue(null); mocks.history.mockResolvedValue([]); mocks.createMessage.mockClear();
  mocks.stream.mockImplementationOnce(async (_input, _targets, onDelta) => { onDelta("Parcial"); throw new Error("disconnect"); });
  await expect(respondAsNexus({ userId: "u1", conversationId: "c1", message: "Oi", onDelta: vi.fn() })).rejects.toThrow();
  expect(mocks.createMessage.mock.calls.filter(([args]) => args.data.role === "assistant")).toHaveLength(0);
});

it("routes an explicit project request without calling a paid model", async () => {
  vi.clearAllMocks();
  mocks.findConversation.mockResolvedValue({id:"c"});
  mocks.findAgent.mockResolvedValue(null);
  mocks.proposeProject.mockResolvedValue({message:{id:"proposal"},context:{}});
  const result=await respondAsNexus({userId:"u",conversationId:"c",message:"crie um projeto: Loja"});
  expect(result.message.id).toBe("proposal");
  expect(mocks.proposeProject).toHaveBeenCalledWith(expect.objectContaining({userId:"u",conversationId:"c",name:"Loja"}));
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.stream).not.toHaveBeenCalled();
});
it("does not propose projects in a foreign conversation", async () => {
  vi.clearAllMocks();
  mocks.findConversation.mockResolvedValue(null);
  await expect(respondAsNexus({userId:"other",conversationId:"c",message:"/projeto Loja"})).rejects.toThrow();
  expect(mocks.proposeProject).not.toHaveBeenCalled();
});
