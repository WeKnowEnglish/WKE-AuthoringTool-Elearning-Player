import Link from "next/link";

const LABELS: Record<string, string> = {
  "/": "Homepage",
  "/about": "About We Know English",
  "/teach-english-online": "How to teach English online",
  "/esl-activities-for-kids": "ESL activities for kids",
  "/english-learning-for-kids-at-home": "English learning for kids at home",
  "/resources": "Resources hub",
  "/resources/what-is-edtech": "What is EdTech?",
  "/resources/how-is-technology-changing-education":
    "How is technology changing education?",
};

type Props = {
  paths: string[];
};

export function ResourceRelatedLinks({ paths }: Props) {
  const links = paths.filter((path) => path in LABELS || path.startsWith("/"));
  if (links.length === 0) return null;

  return (
    <nav aria-labelledby="resource-related-heading" className="not-prose mt-12">
      <h2 id="resource-related-heading" className="text-xl font-extrabold text-kid-ink">
        Related guides
      </h2>
      <ul className="mt-4 space-y-2">
        {links.map((path) => (
          <li key={path}>
            <Link
              href={path}
              className="text-sm font-extrabold text-kid-ink underline underline-offset-2"
            >
              {LABELS[path] ?? path}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
