import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Renders AI-generated text (feedback, ideal answers, etc.) as formatted
 * markdown — bold, lists, code blocks and tables — instead of raw text.
 * Styled with the Tailwind typography plugin (`prose`).
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-pre:bg-muted prose-pre:text-foreground prose-pre:overflow-x-auto",
        "prose-code:before:content-none prose-code:after:content-none",
        "leading-relaxed",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
