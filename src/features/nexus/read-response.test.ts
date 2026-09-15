import { expect, it } from "vitest";
import { readNexusResponse } from "./read-response";
it("waits for persistence confirmation after receiving deltas", async () => {
  const body = new Response('{"type":"delta","text":"Olá"}\n{"type":"done","message":{"content":"Olá"}}\n').body!;
  const chunks: string[] = [];
  expect(await readNexusResponse(body, text => chunks.push(text))).toBe("Olá"); expect(chunks).toEqual(["Olá"]);
});
it("rejects missing persistence confirmation", async () => {
  await expect(readNexusResponse(new Response('{"type":"delta","text":"Olá"}\n').body!, () => {})).rejects.toThrow("histórico");
});
it("shows a safe backend error rather than pretending success", async () => {
  await expect(readNexusResponse(new Response('{"type":"error","error":"Sem cota"}\n').body!, () => {})).rejects.toThrow("Sem cota");
});
