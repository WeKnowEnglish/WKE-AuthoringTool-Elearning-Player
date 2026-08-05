import type {
  VocabListEntry,
  VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function assertEntry(value: unknown, index: number): VocabListEntry {
  if (!isRecord(value)) throw new Error(`Entry ${index + 1} must be an object.`);
  const id = assertString(value.id, `Entry ${index + 1} id`);
  // Empty word allowed while authoring a new row; list save requires ≥1 filled lemma.
  const word = typeof value.word === "string" ? value.word.trim() : "";
  const entry: VocabListEntry = { id, word };
  if (typeof value.definitionEn === "string" && value.definitionEn.trim()) {
    entry.definitionEn = value.definitionEn.trim();
  }
  if (typeof value.example === "string" && value.example.trim()) {
    entry.example = value.example.trim();
  }
  if (typeof value.notes === "string" && value.notes.trim()) {
    entry.notes = value.notes.trim();
  }
  if (typeof value.imageUrl === "string" && value.imageUrl.trim()) {
    entry.imageUrl = value.imageUrl.trim();
  }
  if (value.imageFit === "cover" || value.imageFit === "contain") {
    entry.imageFit = value.imageFit;
  }
  if (typeof value.audioUrl === "string" && value.audioUrl.trim()) {
    entry.audioUrl = value.audioUrl.trim();
  }
  if (typeof value.sourceWordId === "string" && value.sourceWordId.trim()) {
    entry.sourceWordId = value.sourceWordId.trim();
  }
  return entry;
}

export function createBlankVocabularyListDocument(): VocabularyListDocument {
  return {
    version: 1,
    kind: "vocabulary-list",
    id: "vocab-list-blank",
    name: "New vocabulary list",
    entries: [
      {
        id: "v1",
        word: "",
      },
    ],
  };
}

/** Small bakery sample so authors can open something useful immediately. */
export function createBakeryVocabularyListDocument(): VocabularyListDocument {
  return {
    version: 1,
    kind: "vocabulary-list",
    id: "bakery-vocab-list",
    name: "Bakery vocabulary",
    cefr: "A1",
    entries: [
      {
        id: "v1",
        word: "bread",
        definitionEn: "Food made from flour that you buy at a bakery.",
        example: "I buy bread at the bakery.",
      },
      {
        id: "v2",
        word: "cake",
        definitionEn: "A sweet food for birthdays.",
        example: "We eat cake on my birthday.",
      },
      {
        id: "v3",
        word: "cookie",
        definitionEn: "A small sweet biscuit.",
        example: "She has a cookie with milk.",
      },
      {
        id: "v4",
        word: "bakery",
        definitionEn: "A shop that sells bread and cakes.",
        example: "The bakery opens at seven.",
      },
    ],
  };
}

/** Validate and return a typed vocabulary list document. */
export function validateVocabularyListDocument(value: unknown): VocabularyListDocument {
  if (!isRecord(value)) throw new Error("Vocabulary list must be an object.");
  if (value.version !== 1) throw new Error("Vocabulary list documents must be version 1.");
  if (value.kind !== "vocabulary-list") {
    throw new Error('Document kind must be "vocabulary-list".');
  }

  const id = assertString(value.id, "List id");
  const name = assertString(value.name, "List name");
  if (!Array.isArray(value.entries) || value.entries.length < 1) {
    throw new Error("At least one vocabulary entry is required.");
  }

  const entries = value.entries.map((entry, index) => assertEntry(entry, index));
  const entryIds = new Set<string>();
  for (const entry of entries) {
    if (entryIds.has(entry.id)) throw new Error(`Duplicate entry id "${entry.id}".`);
    entryIds.add(entry.id);
  }
  if (!entries.some((entry) => entry.word.trim())) {
    throw new Error("At least one word is required.");
  }

  const document: VocabularyListDocument = {
    version: 1,
    kind: "vocabulary-list",
    id,
    name,
    entries,
  };
  if (typeof value.cefr === "string" && value.cefr.trim()) {
    document.cefr = value.cefr.trim();
  }
  return document;
}

export function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function suggestedVocabularyListFilename(document: VocabularyListDocument): string {
  const slug =
    document.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vocabulary-list";
  return `${slug}.wkevocab.json`;
}

export type VocabularyListFileResult = {
  success: boolean;
  error?: string;
  handle?: FileSystemFileHandle;
};

/** Save with a location picker when supported; falls back to Downloads. */
export async function saveVocabularyListToDisk(
  document: VocabularyListDocument,
  existingHandle?: FileSystemFileHandle | null,
): Promise<VocabularyListFileResult> {
  try {
    const valid = validateVocabularyListDocument(document);
    const suggestedName = suggestedVocabularyListFilename(valid);

    if (existingHandle) {
      const serialized = JSON.stringify(valid, null, 2);
      const writable = await existingHandle.createWritable();
      await writable.write(serialized);
      await writable.close();
      return { success: true, handle: existingHandle };
    }

    let handle: FileSystemFileHandle | null = null;
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        handle = await (
          window as Window & {
            showSaveFilePicker: (options?: object) => Promise<FileSystemFileHandle>;
          }
        ).showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: "WKE Vocabulary List",
              // Chrome rejects some compound extensions in `accept`; keep `.json` only.
              accept: { "application/json": [".json"] },
            },
          ],
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return { success: false };
        }
        handle = null;
      }
    }

    const serialized = JSON.stringify(valid, null, 2);
    if (handle) {
      const writable = await handle.createWritable();
      await writable.write(serialized);
      await writable.close();
      return { success: true, handle };
    }

    downloadTextFile(serialized, suggestedName);
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not save vocabulary list.",
    };
  }
}

/** Open via native file picker when supported. */
export async function pickVocabularyListFile(): Promise<{
  document: VocabularyListDocument;
  handle?: FileSystemFileHandle;
} | null> {
  if (!("showOpenFilePicker" in window)) return null;

  try {
    const [handle] = await (
      window as Window & {
        showOpenFilePicker: (options?: object) => Promise<FileSystemFileHandle[]>;
      }
    ).showOpenFilePicker({
      types: [
        {
          description: "WKE Vocabulary List",
          accept: { "application/json": [".json", ".wkevocab.json"] },
        },
      ],
      multiple: false,
    });
    const file = await handle.getFile();
    const document = validateVocabularyListDocument(JSON.parse(await file.text()));
    return { document, handle };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return null;
    throw err;
  }
}
