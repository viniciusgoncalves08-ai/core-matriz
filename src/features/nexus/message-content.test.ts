import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MessageContent } from "./message-content";
it("renders Markdown lists, code and tables", () => {
  const html = renderToStaticMarkup(createElement(MessageContent, { content: '**Título**\n\n- item\n\n```js\nconst x = 1;\n```\n\n|A|B|\n|-|-|\n|1|2|' }));
  expect(html).toContain('<strong>Título</strong>'); expect(html).toContain('<li>item</li>'); expect(html).toContain('<pre>'); expect(html).toContain('<table>');
});
it("does not execute HTML, unsafe URLs or load remote images", () => {
  const html = renderToStaticMarkup(createElement(MessageContent, { content: '<script>alert(1)</script>\n\n[link](javascript:alert%281%29)\n\n![remote](https://example.com/tracker.png)' }));
  expect(html).not.toContain('<script'); expect(html).not.toContain('javascript:'); expect(html).not.toContain('<img');
});
