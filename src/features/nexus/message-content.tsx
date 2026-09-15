import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
export function MessageContent({ content }: { content: string }) {
  return <div className="message-markdown"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    // Avoid fetching remote tracking images from model-generated content.
    img: ({ alt }) => <span>[Imagem: {alt || "sem descrição"}]</span>,
    table: ({ children }) => <div className="markdown-table"><table>{children}</table></div>,
  }}>{content}</Markdown></div>;
}
