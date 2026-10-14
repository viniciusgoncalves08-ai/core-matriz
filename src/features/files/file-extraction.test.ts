import { expect, it } from "vitest";
import { extractFile, MAX_FILE_BYTES } from "./file-extraction";
import { pdfFixture } from "./pdf-fixture";
import { readFileBody } from "./file-api";
import { isMemorySnapshot } from "@/features/memory/memory-snapshot";
it("extracts real PDF text by page without a network or browser worker", async () => {
  const result = await extractFile("fonte.pdf", pdfFixture("Prazo fornecedor dezembro", 2));
  expect(result.pageCount).toBe(2);
  expect(result.pages[1]).toMatchObject({ page: 2, text: expect.stringContaining("Prazo fornecedor dezembro") });
});
it("rejects PDFs beyond page limit and scanned-only PDFs", async () => {
  await expect(extractFile("long.pdf", pdfFixture("content", 31))).rejects.toThrow("30 páginas");
  await expect(extractFile("scan.pdf", pdfFixture(""))).rejects.toThrow("OCR");
});
it("validates bytes, encoding, format and text budget", async () => {
  await expect(extractFile("f.pdf", Buffer.from("not pdf"))).rejects.toThrow("PDF válido");
  await expect(extractFile("f.exe", Buffer.from("abc"))).rejects.toThrow("PDF, TXT");
  await expect(extractFile("f.txt", new Uint8Array(MAX_FILE_BYTES + 1))).rejects.toThrow("1 MB");
  await expect(extractFile("f.txt", Buffer.from([0xff, 0xfe]))).rejects.toThrow("UTF-8");
  await expect(extractFile("f.txt", Buffer.from([0, 1, 2]))).rejects.toThrow("binários");
  await expect(extractFile("f.md", Buffer.from("a".repeat(100001)))).rejects.toThrow("100 mil");
  expect((await extractFile("notas.md", Buffer.from("# Olá\nAção confirmada"))).text).toContain("Olá");
});
it("caps streamed requests even when content length is missing", async () => {
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_FILE_BYTES)); c.enqueue(new Uint8Array(1)); c.close(); } });
  const request = new Request("http://localhost", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  await expect(readFileBody(request)).rejects.toThrow("1 MB");
});
it("does not recycle old file answers as fresh context after deletion", () => {
  expect(isMemorySnapshot({ kind: "file_answer", retrieval: { fileIds: ["old"] } })).toBe(true);
});
