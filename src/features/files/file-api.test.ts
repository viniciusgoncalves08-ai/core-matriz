import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), require: vi.fn(), upload: vi.fn(), get: vi.fn(), remove: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUserId: m.session }));
vi.mock("./file-service", () => ({ requireFileConversation: m.require, uploadFile: m.upload, getFile: m.get, deleteFile: m.remove, listFiles: m.list }));
import { POST, GET } from "@/app/api/files/route";
import { GET as detail, DELETE } from "@/app/api/files/[id]/route";
import { FileError } from "./file-extraction";
import { fileSources } from "./file-sources";
const request = () => new Request("http://localhost/api/files?conversationId=c", { method: "POST", headers: { "X-File-Name": "teste.txt" }, body: "texto" });
beforeEach(() => { vi.clearAllMocks(); m.session.mockResolvedValue("owner"); m.require.mockResolvedValue(undefined); m.upload.mockResolvedValue({ id: "f" }); });
it("requires login before reading or storing uploads", async () => {
  m.session.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  expect((await GET(new Request("http://localhost/api/files?conversationId=c"))).status).toBe(401);
  expect((await DELETE(request(), { params: Promise.resolve({ id: "f" }) })).status).toBe(401);
  expect(m.require).not.toHaveBeenCalled(); expect(m.upload).not.toHaveBeenCalled();
});
it("validates conversation ownership before extraction and hides internal errors", async () => {
  m.require.mockRejectedValueOnce(new FileError("Conversa indisponível.", 404));
  expect((await POST(request())).status).toBe(404); expect(m.upload).not.toHaveBeenCalled();
  m.upload.mockRejectedValueOnce(new Error("database password secret"));
  const response = await POST(request()); expect(response.status).toBe(500); expect(await response.text()).not.toContain("secret");
});
it("uses session owner and serves private downloads without inline executable content", async () => {
  const response = await POST(request()); expect(response.status).toBe(200);
  expect(m.upload).toHaveBeenCalledWith("owner", "c", "teste.txt", expect.any(Uint8Array));
  m.get.mockResolvedValue({ bytes: new Uint8Array([1, 2, 3]), name: "ação.pdf" });
  const download = await detail(new Request("http://localhost/api/files/f?download=1"), { params: Promise.resolve({ id: "f" }) });
  expect(download.headers.get("Cache-Control")).toBe("private, no-store");
  expect(download.headers.get("Content-Type")).toBe("application/octet-stream");
  expect(download.headers.get("Content-Disposition")).toContain("attachment;");
  expect(download.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(new Uint8Array(await download.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
});
it("validates persisted source metadata", () => {
  expect(fileSources(null)).toEqual([]);
  expect(fileSources({ retrieval: { fileSources: [{ id: "x", name: "f.pdf", page: 1 }, { id: "x", name: "f.pdf", page: -1 }, null] } })).toEqual([{ id: "x", name: "f.pdf", page: 1 }]);
});
