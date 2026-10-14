import { MAX_FILE_BYTES } from "./file-limits";
export { MAX_FILE_BYTES } from "./file-limits";
export const MAX_TEXT_CHARS = 100_000;
export class FileError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type FilePage = { page: number; text: string };
export function validateFile(name: string, size: number) {
  if (!size || size > MAX_FILE_BYTES) throw new FileError("Envie um arquivo de até 1 MB, com conteúdo.", 413);
  if (!/\.(pdf|txt|md)$/i.test(name)) throw new FileError("Use PDF, TXT ou Markdown (.md).");
  return name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(-180);
}
export async function extractFile(name: string, bytes: Uint8Array) {
  const safeName = validateFile(name, bytes.length);
  let pages: FilePage[];
  const pdf = /\.pdf$/i.test(name);
  if (pdf) {
    if (Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-") throw new FileError("O conteúdo não é um PDF válido.");
    const { PDFParse } = await import("pdf-parse");
    const { getData } = await import("pdf-parse/worker");
    PDFParse.setWorker(getData());
    const parser = new PDFParse({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: false });
    try {
      const info = await parser.getInfo();
      if (info.total > 30) throw new FileError("Esta versão aceita PDFs de até 30 páginas.");
      pages = [];
      let length = 0;
      for (let page = 1; page <= info.total; page++) {
        const result = await parser.getText({ partial: [page] });
        const text = (result.pages[0]?.text ?? "").replace(/\u0000/g, "").trim();
        length += text.length;
        if (length > MAX_TEXT_CHARS) throw new FileError("O texto extraído excede 100 mil caracteres. Divida o arquivo.");
        pages.push({ page, text });
      }
    } catch (error) {
      if (error instanceof FileError) throw error;
      throw new FileError("Não foi possível ler este PDF. Confira se ele está íntegro e sem senha.");
    } finally { await parser.destroy(); }
  } else {
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim(); }
    catch { throw new FileError("Salve o texto em UTF-8 e tente novamente."); }
    if (/[\x00-\x08\x0e-\x1f]/.test(text)) throw new FileError("O arquivo contém dados binários, não texto simples.");
    if (text.length > MAX_TEXT_CHARS) throw new FileError("Use textos com até 100 mil caracteres.");
    pages = [{ page: 1, text }];
  }
  const text = pages.map(p => p.text).join("\n\n");
  if (!text.trim()) throw new FileError("Não encontrei texto legível. PDFs digitalizados precisam de OCR antes do envio.");
  return { name: safeName, mime: pdf ? "application/pdf" : "text/plain; charset=utf-8", pages, text, pageCount: pages.length };
}
