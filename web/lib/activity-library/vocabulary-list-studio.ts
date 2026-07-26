import {
  countLocalVocabMedia,
  publishLocalVocabMedia,
  validateVocabularyListDocument,
  type VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list";

export type StudioVocabularyListRef = {
  id: string;
  name: string;
  updatedAt: string;
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vocabulary-list"
  );
}

function vocabularyListStubPack(document: VocabularyListDocument): Record<string, unknown> {
  return {
    version: 1,
    kind: "vocabulary-list-pack",
    id: document.id,
    name: document.name,
    entry_count: document.entries.length,
    ...(document.cefr ? { cefr: document.cefr } : {}),
  };
}

export async function listStudioVocabularyLists(): Promise<StudioVocabularyListRef[]> {
  const response = await fetch("/api/studio/activities?format=vocabulary_list&limit=100", {
    method: "GET",
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    activities?: Array<{
      id: string;
      title: string;
      updated_at: string;
    }>;
    error?: string;
  } | null;
  if (!response.ok || !payload?.ok || !Array.isArray(payload.activities)) {
    throw new Error(
      payload?.error ||
        `Could not list vocabulary lists (${response.status}). Are you signed in as a teacher?`,
    );
  }
  return payload.activities.map((row) => ({
    id: row.id,
    name: row.title,
    updatedAt: row.updated_at,
  }));
}

export async function getStudioVocabularyList(
  activityId: string,
): Promise<{ id: string; document: VocabularyListDocument }> {
  const response = await fetch(`/api/studio/activities/${encodeURIComponent(activityId)}`, {
    method: "GET",
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    id?: string;
    format?: string;
    authoring?: unknown;
    pack?: unknown;
    error?: string;
  } | null;
  if (!response.ok || !payload?.ok || !payload.id) {
    throw new Error(
      payload?.error || `Could not load vocabulary list (${response.status}).`,
    );
  }
  if (payload.format && payload.format !== "vocabulary_list") {
    throw new Error("That Activity Bank item is not a vocabulary list.");
  }
  const document = validateVocabularyListDocument(
    payload.authoring ??
      (payload.pack &&
      typeof payload.pack === "object" &&
      !Array.isArray(payload.pack) &&
      (payload.pack as { list?: unknown }).list
        ? (payload.pack as { list: unknown }).list
        : payload.pack),
  );
  return { id: payload.id, document };
}

/**
 * Upload local data-URL media to studio_assets, then save/update the list
 * in studio_activities (survives browser clears; same origin as LTC).
 */
export async function saveVocabularyListToStudio(input: {
  activityId: string | null;
  document: VocabularyListDocument;
}): Promise<StudioVocabularyListRef> {
  let document = validateVocabularyListDocument(input.document);

  const localBefore = countLocalVocabMedia(document);
  if (localBefore.total > 0) {
    const published = await publishLocalVocabMedia(document);
    document = validateVocabularyListDocument(published.document);
    const stillLocal = countLocalVocabMedia(document);
    if (stillLocal.total > 0) {
      throw new Error(
        `Could not upload all media (${stillLocal.total} still local). Check you’re signed in, then try Save again.`,
      );
    }
  }

  const pack = vocabularyListStubPack(document);
  const response = await fetch("/api/studio/activities", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: input.activityId,
      format: "vocabulary_list",
      pack,
      authoring: document,
      title: document.name,
      filename: `${slugify(document.name)}.wkevocab.json`,
      source: {
        via: "vocabulary_list_workspace",
        entryCount: document.entries.length,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    id?: string;
    title?: string;
    created_at?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.ok || !payload.id) {
    throw new Error(
      payload?.error ||
        `Could not save vocabulary list (${response.status}). Apply migration 074 if vocabulary_list is rejected.`,
    );
  }

  return {
    id: payload.id,
    name: payload.title ?? document.name,
    updatedAt: payload.created_at ?? new Date().toISOString(),
  };
}

export async function deleteStudioVocabularyList(activityId: string): Promise<void> {
  const response = await fetch(`/api/studio/activities/${encodeURIComponent(activityId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload?.error || `Could not delete vocabulary list (${response.status}).`,
    );
  }
}
