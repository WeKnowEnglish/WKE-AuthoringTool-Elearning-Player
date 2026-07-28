import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
};

function isInternalHref(href: string | undefined): href is string {
  return Boolean(href && href.startsWith("/") && !href.startsWith("//"));
}

export function ResourceMarkdown({ markdown }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a({ href, children }) {
          if (isInternalHref(href)) {
            return <Link href={href}>{children}</Link>;
          }
          return (
            <a href={href} rel="noopener noreferrer" target="_blank">
              {children}
            </a>
          );
        },
        table({ children }) {
          return (
            <div className="not-prose mt-6 overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead>{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="font-semibold text-kid-ink/80">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="border-b border-kid-ink/10">{children}</tr>;
        },
        th({ children }) {
          return (
            <th className="border-b-2 border-kid-ink/20 py-2 pr-4 font-extrabold text-kid-ink">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="py-2 pr-4 align-top">{children}</td>;
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
