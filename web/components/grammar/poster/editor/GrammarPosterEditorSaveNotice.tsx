import type { GrammarModulePersistedStatus } from "@/lib/data/grammar-modules";

type Props = {
  persistedStatus: GrammarModulePersistedStatus | null;
  contentSource: "database" | "file";
};

export function GrammarPosterEditorSaveNotice({ persistedStatus, contentSource }: Props) {
  const publishedLive = persistedStatus === "published";

  return (
    <div
      className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
      role="status"
    >
      <p className="font-semibold">
        {publishedLive ?
          "This poster is live for students."
        : persistedStatus === "draft" ?
          "Saved as draft — students still see the bundled version until you publish."
        : "Not saved yet — students see the bundled version until you publish."}
      </p>
      <p className="mt-1 text-sky-900/90">
        Use <strong>Save</strong> to store your work. Use <strong>Publish</strong> when validation
        passes and you want students to see this version
        {contentSource === "file" ? " instead of the bundled JSON file" : ""}.
      </p>
    </div>
  );
}
