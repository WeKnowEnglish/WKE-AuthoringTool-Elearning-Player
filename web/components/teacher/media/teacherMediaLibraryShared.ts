/**
 * Shared teacher media-library picker (Canva-style home rows → folder drill-in).
 */
import {
  searchTeacherMedia,
  type MediaAssetRow,
  type MediaKind,
  type MediaLibraryScope,
} from "@/lib/actions/media";
import { MEDIA_PICKER_PAGE_SIZE } from "@/components/teacher/media/mediaPickerConstants";

export type MediaUrlChangeDetail = {
  mediaAssetId?: string;
};

/** Folder rows on the home screen / drill-in targets. */
export type TeacherMediaFolderId =
  | "school_images"
  | "my_uploads"
  | "school_audio"
  | "linked";

export type TeacherMediaFolderDef = {
  id: TeacherMediaFolderId;
  label: string;
  kind: MediaKind | "all";
  scope: MediaLibraryScope;
  /** When true, search uses lexiconId instead of scope. */
  linked?: boolean;
};

export type TeacherMediaFolderPreview = TeacherMediaFolderDef & {
  assets: MediaAssetRow[];
  total: number;
  loading: boolean;
  err: string | null;
};

export type TeacherMediaLibraryView = "home" | "folder";

export type TeacherMediaLibraryPresentation = "modal" | "embedded";

export type TeacherMediaLibraryState = {
  open: boolean;
  ownerId: string | null;
  presentation: TeacherMediaLibraryPresentation;
  /** Kind of the field that opened the picker (image/audio/video). */
  fieldKind: MediaKind;
  lexiconId: string | null;
  view: TeacherMediaLibraryView;
  homeQuery: string;
  folders: TeacherMediaFolderPreview[];
  homeLoading: boolean;
  /** Drill-in */
  folderId: TeacherMediaFolderId | null;
  folderQuery: string;
  assets: MediaAssetRow[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  err: string | null;
  onSelect: ((url: string, detail?: MediaUrlChangeDetail) => void) | null;
};

const HOME_ROW_LIMIT = 12;
const SHARED_LIBRARY_DEBOUNCE_MS = 350;
const SHARED_LIBRARY_CACHE_TTL_MS = 3 * 60 * 1000;
const SHARED_LIBRARY_RECENT_LIMIT = 10;

const sharedLibraryListeners = new Set<() => void>();
const searchCache = new Map<string, { at: number; rows: MediaAssetRow[]; total: number }>();
const sharedLibraryRecentByKind = new Map<MediaKind, MediaAssetRow[]>();

let homeSearchTimer: ReturnType<typeof setTimeout> | null = null;
let folderSearchTimer: ReturnType<typeof setTimeout> | null = null;
let homeRequestSeq = 0;
let folderRequestSeq = 0;

let sharedLibraryState: TeacherMediaLibraryState = {
  open: false,
  ownerId: null,
  presentation: "modal",
  fieldKind: "image",
  lexiconId: null,
  view: "home",
  homeQuery: "",
  folders: [],
  homeLoading: false,
  folderId: null,
  folderQuery: "",
  assets: [],
  total: 0,
  loading: false,
  loadingMore: false,
  err: null,
  onSelect: null,
};

function emit() {
  for (const listener of sharedLibraryListeners) listener();
}

export function subscribeTeacherMediaLibrary(listener: () => void) {
  sharedLibraryListeners.add(listener);
  return () => {
    sharedLibraryListeners.delete(listener);
  };
}

export function teacherMediaLibrarySnapshot() {
  return sharedLibraryState;
}

export function setTeacherMediaLibraryState(next: Partial<TeacherMediaLibraryState>) {
  sharedLibraryState = { ...sharedLibraryState, ...next };
  emit();
}

function cacheKey(parts: Record<string, string | number | null | undefined>) {
  return Object.entries(parts)
    .map(([k, v]) => `${k}=${v ?? ""}`)
    .join("|");
}

export function folderDefsForPicker(lexiconId: string | null): TeacherMediaFolderDef[] {
  const rows: TeacherMediaFolderDef[] = [
    {
      id: "school_images",
      label: "School images",
      kind: "image",
      scope: "school",
    },
    {
      id: "my_uploads",
      label: "My uploads",
      kind: "all",
      scope: "mine",
    },
    {
      id: "school_audio",
      label: "School audio",
      kind: "audio",
      scope: "school",
    },
  ];
  if (lexiconId) {
    rows.push({
      id: "linked",
      label: "Linked to this word",
      kind: "all",
      scope: "school",
      linked: true,
    });
  }
  return rows;
}

function searchKind(def: TeacherMediaFolderDef, _fieldKind: MediaKind): MediaKind | "all" {
  if (def.id === "my_uploads" || def.id === "linked") return "all";
  return def.kind;
}

async function fetchFolderPage(input: {
  def: TeacherMediaFolderDef;
  fieldKind: MediaKind;
  lexiconId: string | null;
  q: string;
  limit: number;
  offset: number;
}): Promise<{ rows: MediaAssetRow[]; total: number }> {
  const kind = searchKind(input.def, input.fieldKind);
  const key = cacheKey({
    folder: input.def.id,
    kind,
    q: input.q.trim().toLowerCase(),
    lex: input.def.linked ? input.lexiconId : null,
    scope: input.def.linked ? "linked" : input.def.scope,
    limit: input.limit,
    offset: input.offset,
  });
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.at < SHARED_LIBRARY_CACHE_TTL_MS && input.offset === 0) {
    return { rows: cached.rows, total: cached.total };
  }

  const { rows, total } = await searchTeacherMedia({
    kind: kind === "all" ? "all" : kind,
    q: input.q,
    limit: input.limit,
    offset: input.offset,
    ...(input.def.linked && input.lexiconId ?
      { lexiconId: input.lexiconId }
    : { scope: input.def.scope }),
  });

  if (input.offset === 0) {
    searchCache.set(key, { at: Date.now(), rows, total });
  }
  return { rows, total };
}

export async function loadTeacherMediaLibraryHome(opts?: { debounced?: boolean }) {
  if (!sharedLibraryState.open) return;
  if (homeSearchTimer) {
    clearTimeout(homeSearchTimer);
    homeSearchTimer = null;
  }

  const run = async () => {
    if (!sharedLibraryState.open || sharedLibraryState.view !== "home") return;
    const requestId = ++homeRequestSeq;
    const defs = folderDefsForPicker(sharedLibraryState.lexiconId);
    const q = sharedLibraryState.homeQuery.trim();
    const fieldKind = sharedLibraryState.fieldKind;
    const lexiconId = sharedLibraryState.lexiconId;

    setTeacherMediaLibraryState({
      homeLoading: true,
      folders: defs.map((d) => ({
        ...d,
        assets: [],
        total: 0,
        loading: true,
        err: null,
      })),
    });

    const results = await Promise.all(
      defs.map(async (def) => {
        try {
          const { rows, total } = await fetchFolderPage({
            def,
            fieldKind,
            lexiconId,
            q,
            limit: HOME_ROW_LIMIT,
            offset: 0,
          });
          return {
            ...def,
            assets: rows,
            total,
            loading: false,
            err: null,
          } satisfies TeacherMediaFolderPreview;
        } catch (e: unknown) {
          return {
            ...def,
            assets: [],
            total: 0,
            loading: false,
            err: e instanceof Error ? e.message : "Failed to load",
          } satisfies TeacherMediaFolderPreview;
        }
      }),
    );

    if (requestId !== homeRequestSeq) return;
    setTeacherMediaLibraryState({
      folders: results,
      homeLoading: false,
    });
  };

  if (opts?.debounced) {
    homeSearchTimer = setTimeout(() => {
      void run();
    }, SHARED_LIBRARY_DEBOUNCE_MS);
  } else {
    void run();
  }
}

export function openTeacherMediaLibrary(
  ownerId: string,
  kind: MediaKind,
  onSelect: (url: string, detail?: MediaUrlChangeDetail) => void,
  _queryHint?: string,
  lexiconId?: string,
  presentation: TeacherMediaLibraryPresentation = "modal",
) {
  const linkedId = lexiconId?.trim() || null;
  setTeacherMediaLibraryState({
    open: true,
    ownerId,
    presentation,
    fieldKind: kind,
    lexiconId: linkedId,
    view: "home",
    homeQuery: "",
    folders: [],
    homeLoading: true,
    folderId: null,
    folderQuery: "",
    assets: [],
    total: 0,
    loading: false,
    loadingMore: false,
    err: null,
    onSelect,
  });
  void loadTeacherMediaLibraryHome({ debounced: false });
}

export function closeTeacherMediaLibrary() {
  homeRequestSeq += 1;
  folderRequestSeq += 1;
  if (homeSearchTimer) {
    clearTimeout(homeSearchTimer);
    homeSearchTimer = null;
  }
  if (folderSearchTimer) {
    clearTimeout(folderSearchTimer);
    folderSearchTimer = null;
  }
  setTeacherMediaLibraryState({
    open: false,
    ownerId: null,
    presentation: "modal",
    view: "home",
    folderId: null,
    onSelect: null,
    lexiconId: null,
    homeLoading: false,
    loading: false,
    loadingMore: false,
    err: null,
  });
}

export function setTeacherMediaLibraryHomeQuery(query: string) {
  setTeacherMediaLibraryState({ homeQuery: query, view: "home", folderId: null });
  void loadTeacherMediaLibraryHome({ debounced: true });
}

export function openTeacherMediaFolder(folderId: TeacherMediaFolderId) {
  const def = folderDefsForPicker(sharedLibraryState.lexiconId).find((d) => d.id === folderId);
  if (!def) return;
  setTeacherMediaLibraryState({
    view: "folder",
    folderId,
    folderQuery: sharedLibraryState.homeQuery,
    assets: [],
    total: 0,
    loading: true,
    loadingMore: false,
    err: null,
  });
  void runFolderSearch({ reset: true, debounced: false });
}

export function backToTeacherMediaLibraryHome() {
  folderRequestSeq += 1;
  if (folderSearchTimer) {
    clearTimeout(folderSearchTimer);
    folderSearchTimer = null;
  }
  setTeacherMediaLibraryState({
    view: "home",
    folderId: null,
    assets: [],
    total: 0,
    loading: false,
    loadingMore: false,
    err: null,
  });
  void loadTeacherMediaLibraryHome({ debounced: false });
}

export function setTeacherMediaFolderQuery(query: string) {
  setTeacherMediaLibraryState({ folderQuery: query });
  void runFolderSearch({ reset: true, debounced: true });
}

async function runFolderSearch(opts: { reset: boolean; debounced: boolean }) {
  if (!sharedLibraryState.open || sharedLibraryState.view !== "folder") return;
  if (folderSearchTimer) {
    clearTimeout(folderSearchTimer);
    folderSearchTimer = null;
  }

  const kickoff = async () => {
    if (!sharedLibraryState.open || sharedLibraryState.view !== "folder") return;
    const folderId = sharedLibraryState.folderId;
    const def = folderDefsForPicker(sharedLibraryState.lexiconId).find((d) => d.id === folderId);
    if (!def) return;

    const requestId = ++folderRequestSeq;
    const offset = opts.reset ? 0 : sharedLibraryState.assets.length;
    setTeacherMediaLibraryState({
      err: null,
      loading: opts.reset,
      loadingMore: !opts.reset,
    });

    try {
      const { rows, total } = await fetchFolderPage({
        def,
        fieldKind: sharedLibraryState.fieldKind,
        lexiconId: sharedLibraryState.lexiconId,
        q: sharedLibraryState.folderQuery,
        limit: MEDIA_PICKER_PAGE_SIZE,
        offset,
      });
      if (requestId !== folderRequestSeq) return;
      setTeacherMediaLibraryState({
        assets: opts.reset ? rows : [...sharedLibraryState.assets, ...rows],
        total,
        loading: false,
        loadingMore: false,
        err: null,
      });
    } catch (e: unknown) {
      if (requestId !== folderRequestSeq) return;
      setTeacherMediaLibraryState({
        loading: false,
        loadingMore: false,
        err: e instanceof Error ? e.message : "Failed to load library",
      });
    }
  };

  if (opts.debounced) {
    folderSearchTimer = setTimeout(() => {
      void kickoff();
    }, SHARED_LIBRARY_DEBOUNCE_MS);
  } else {
    void kickoff();
  }
}

export function loadMoreTeacherMediaLibrary() {
  if (
    !sharedLibraryState.open ||
    sharedLibraryState.view !== "folder" ||
    sharedLibraryState.loading ||
    sharedLibraryState.loadingMore ||
    sharedLibraryState.assets.length >= sharedLibraryState.total
  ) {
    return;
  }
  void runFolderSearch({ reset: false, debounced: false });
}

export function selectTeacherMediaLibraryAsset(url: string, asset?: MediaAssetRow | null) {
  const hit =
    asset ??
    sharedLibraryState.assets.find((a) => a.public_url === url) ??
    sharedLibraryState.folders.flatMap((f) => f.assets).find((a) => a.public_url === url) ??
    sharedLibraryRecentByKind
      .get(sharedLibraryState.fieldKind)
      ?.find((a) => a.public_url === url) ??
    null;

  if (hit) {
    const prev = sharedLibraryRecentByKind.get(sharedLibraryState.fieldKind) ?? [];
    const next = [hit, ...prev.filter((a) => a.public_url !== hit.public_url)].slice(
      0,
      SHARED_LIBRARY_RECENT_LIMIT,
    );
    sharedLibraryRecentByKind.set(sharedLibraryState.fieldKind, next);
  }
  sharedLibraryState.onSelect?.(url, hit ? { mediaAssetId: hit.id } : undefined);
  // Embedded panel stays open so teachers can keep browsing; modal closes.
  if (sharedLibraryState.presentation === "modal") {
    closeTeacherMediaLibrary();
  }
}

export function setTeacherMediaLibraryFieldKind(kind: MediaKind) {
  setTeacherMediaLibraryState({ fieldKind: kind });
}

export function setTeacherMediaLibraryOnSelect(
  onSelect: ((url: string, detail?: MediaUrlChangeDetail) => void) | null,
) {
  setTeacherMediaLibraryState({ onSelect });
}

export function getTeacherMediaLibraryRecent(kind: MediaKind): MediaAssetRow[] {
  return sharedLibraryRecentByKind.get(kind) ?? [];
}

const FOLDER_LABELS: Record<TeacherMediaFolderId, string> = {
  school_images: "School images",
  my_uploads: "My uploads",
  school_audio: "School audio",
  linked: "Linked to this word",
};

export function folderLabel(folderId: TeacherMediaFolderId | null): string {
  if (!folderId) return "Media library";
  return FOLDER_LABELS[folderId] ?? "Folder";
}

/** Resolve display kind for a row asset (for thumbs). */
export function assetDisplayKind(contentType: string, fallback: MediaKind): MediaKind {
  const c = contentType.toLowerCase();
  if (c.startsWith("audio/")) return "audio";
  if (c.startsWith("video/")) return "video";
  if (c.startsWith("image/")) return "image";
  return fallback;
}
