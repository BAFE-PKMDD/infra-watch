import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-3 break-words text-sm leading-7 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-indigo-300 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-400 [&_blockquote]:pl-4 [&_pre]:overflow-x-auto [&_pre]:bg-muted [&_pre]:p-3 [&_table]:block [&_table]:overflow-x-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
