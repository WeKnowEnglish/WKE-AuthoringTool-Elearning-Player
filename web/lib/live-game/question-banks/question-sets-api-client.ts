import type { LiveGameQuestionSetCard } from "@/lib/live-game/question-banks/types";
import { formatQuestionSetCountLabel } from "@/lib/live-game/question-banks/question-set-card-utils";
import { diagnosticFetch } from "@/lib/live-game/diagnostics/client";

export type { LiveGameQuestionSetCard };
export {
  DEFAULT_LIVE_GAME_QUESTION_SET_UUID,
} from "@/lib/live-game/question-banks/question-set-ids";
export { formatQuestionSetCountLabel, totalQuestionCount } from "@/lib/live-game/question-banks/question-set-card-utils";

export const LIVE_GAME_LAST_QUESTION_SET_STORAGE_KEY = "wke-live-game-last-question-set-id";
export const LIVE_GAME_PUBLISHED_SETS_CACHE_PREFIX = "wke:live-game:published-sets:v1:";
/** Session-scoped teacher cache for host carousel summaries (no question content). */
export const LIVE_GAME_PUBLISHED_SETS_CACHE_TTL_MS = 60_000;

type QuestionSetsResponse = {
  sets?: LiveGameQuestionSetCard[];
  error?: string;
  meta?: {
    resultCount?: number;
    queryCount?: number;
    queryStrategy?: string;
    teacherId?: string;
  };
};

type CachedPublishedSets = {
  teacherId: string;
  cachedAt: number;
  sets: LiveGameQuestionSetCard[];
};

let publishedQuestionSetsRequest: {
  startedAt: number;
  promise: Promise<LiveGameQuestionSetCard[]>;
  bypassCache: boolean;
} | null = null;
const PUBLISHED_QUESTION_SETS_DEDUPE_MS = 5_000;

function cacheKeyForTeacher(teacherId: string) {
  return `${LIVE_GAME_PUBLISHED_SETS_CACHE_PREFIX}${teacherId}`;
}

export function readPublishedQuestionSetsCache(teacherId: string): CachedPublishedSets | null {
  if (typeof window === "undefined" || !teacherId) return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKeyForTeacher(teacherId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPublishedSets;
    if (!parsed?.teacherId || parsed.teacherId !== teacherId || !Array.isArray(parsed.sets)) {
      return null;
    }
    if (Date.now() - parsed.cachedAt > LIVE_GAME_PUBLISHED_SETS_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(cacheKeyForTeacher(teacherId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePublishedQuestionSetsCache(teacherId: string, sets: LiveGameQuestionSetCard[]) {
  if (typeof window === "undefined" || !teacherId) return;
  try {
    const payload: CachedPublishedSets = {
      teacherId,
      cachedAt: Date.now(),
      sets,
    };
    window.sessionStorage.setItem(cacheKeyForTeacher(teacherId), JSON.stringify(payload));
  } catch {
    // Cache must never break setup.
  }
}

export function clearPublishedQuestionSetsCache(teacherId?: string) {
  if (typeof window === "undefined") return;
  try {
    if (teacherId) {
      window.sessionStorage.removeItem(cacheKeyForTeacher(teacherId));
      return;
    }
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(LIVE_GAME_PUBLISHED_SETS_CACHE_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export type FetchPublishedQuestionSetsOptions = {
  /** Manual retry / refresh bypasses session cache. */
  bypassCache?: boolean;
};

export async function fetchPublishedQuestionSets(
  options: FetchPublishedQuestionSetsOptions = {},
): Promise<LiveGameQuestionSetCard[]> {
  const bypassCache = options.bypassCache === true;
  const now = Date.now();
  if (
    publishedQuestionSetsRequest &&
    !bypassCache &&
    !publishedQuestionSetsRequest.bypassCache &&
    now - publishedQuestionSetsRequest.startedAt < PUBLISHED_QUESTION_SETS_DEDUPE_MS
  ) {
    return publishedQuestionSetsRequest.promise;
  }

  const promise = (async () => {
    const response = await diagnosticFetch(
      "/api/live-game/question-sets",
      { cache: "no-store" },
      {
        phase: "entry",
        name: "question_sets_load",
        detail: {
          cacheOutcome: bypassCache ? "bypass" : "miss_pending",
          classLoadDeferred: true,
          blockingSetup: false,
        },
      },
    );
    const payload = (await response.json()) as QuestionSetsResponse;
    if (!response.ok || !payload.sets) {
      throw new Error(payload.error ?? "Could not load question sets.");
    }

    const teacherId = payload.meta?.teacherId ?? null;
    const responseBytes = Number(response.headers.get("content-length")) ||
      JSON.stringify(payload).length;
    const queryCount =
      Number(response.headers.get("X-Live-Game-Query-Count")) ||
      payload.meta?.queryCount ||
      null;
    const queryStrategy =
      response.headers.get("X-Live-Game-Query-Strategy") ||
      payload.meta?.queryStrategy ||
      null;

    // Enrich the completed span with safe summary fields via a follow-up mark.
    const { recordLiveGameDiagnostic } = await import("@/lib/live-game/diagnostics/client");
    recordLiveGameDiagnostic("entry", "question_sets_load_meta", {
      resultCount: payload.sets.length,
      responseBytes,
      queryCount,
      queryStrategy,
      cacheOutcome: bypassCache ? "bypass" : "network",
      classLoadDeferred: true,
      blockingSetup: false,
      teacherScoped: Boolean(teacherId),
    });

    if (teacherId) {
      writePublishedQuestionSetsCache(teacherId, payload.sets);
    }

    return payload.sets;
  })();

  publishedQuestionSetsRequest = { startedAt: now, promise, bypassCache };
  try {
    return await promise;
  } catch (error) {
    if (publishedQuestionSetsRequest?.promise === promise) publishedQuestionSetsRequest = null;
    throw error;
  }
}

/**
 * Attempts a teacher-scoped session cache hit before network.
 * Used by the host page so retry can force network while first paint can reuse.
 */
export async function fetchPublishedQuestionSetsPreferCache(
  options: FetchPublishedQuestionSetsOptions & { teacherIdHint?: string } = {},
): Promise<{ sets: LiveGameQuestionSetCard[]; cacheOutcome: "hit" | "miss" | "bypass" }> {
  if (!options.bypassCache && options.teacherIdHint) {
    const cached = readPublishedQuestionSetsCache(options.teacherIdHint);
    if (cached) {
      return { sets: cached.sets, cacheOutcome: "hit" };
    }
  }
  if (options.bypassCache && options.teacherIdHint) {
    clearPublishedQuestionSetsCache(options.teacherIdHint);
  }
  const sets = await fetchPublishedQuestionSets({ bypassCache: options.bypassCache });
  return { sets, cacheOutcome: options.bypassCache ? "bypass" : "miss" };
}

export function readLastSelectedQuestionSetId(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(LIVE_GAME_LAST_QUESTION_SET_STORAGE_KEY);
  return value && value.length > 0 ? value : null;
}

export function writeLastSelectedQuestionSetId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIVE_GAME_LAST_QUESTION_SET_STORAGE_KEY, id);
}

export function resolveInitialQuestionSetSelection(
  sets: LiveGameQuestionSetCard[],
): string | null {
  if (sets.length === 0) return null;
  const stored = readLastSelectedQuestionSetId();
  if (stored && sets.some((set) => set.id === stored)) {
    return stored;
  }
  return sets[0]!.id;
}

export function formatQuestionSetCardCount(set: LiveGameQuestionSetCard): string {
  return formatQuestionSetCountLabel({ level: set.level, questionCount: set.questionCount });
}
