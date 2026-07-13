"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { LiveGameLandingShell } from "@/components/live-game/LiveGameLandingShell";
import { LiveGameQuestionSetCarousel } from "@/components/live-game/LiveGameQuestionSetCarousel";
import {
  LIVE_GAME_DEFAULT_PLAYER_COLOR,
  setLiveGameSessionContext,
} from "@/lib/live-game/liveblocks/identity";
import {
  ENGLISH_CRAFT_DURATION_OPTIONS,
  ENGLISH_CRAFT_MODE,
  formatEnglishCraftDurationSelectValue,
  normalizeEnglishCraftDurationMinutes,
  parseEnglishCraftDurationSelectValue,
  type EnglishCraftSessionDuration,
} from "@/lib/live-game/modes/english-craft/config";
import {
  LIVE_GAME_DEFAULT_AVATAR_ID,
  type LiveGameCharacterId,
} from "@/lib/live-game/characters/live-game-characters";
import { LiveGameCharacterPicker } from "@/components/live-game/LiveGameCharacterPicker";
import type { LiveGameQuestionSetCard } from "@/lib/live-game/question-banks/types";
import {
  fetchPublishedQuestionSets,
  resolveInitialQuestionSetSelection,
  writeLastSelectedQuestionSetId,
} from "@/lib/live-game/question-banks/question-sets-api-client";
import { duplicateQuestionSet } from "@/lib/live-game/question-banks/question-sets-editor-api";

type TeacherClassOption = { id: string; title: string };

export function LiveGameHostPage({ initialClassId = "" }: { initialClassId?: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("Teacher");
  const [avatarId, setAvatarId] = useState<LiveGameCharacterId>(LIVE_GAME_DEFAULT_AVATAR_ID);
  const [durationMinutes, setDurationMinutes] = useState<EnglishCraftSessionDuration>(
    ENGLISH_CRAFT_MODE.defaultDurationMinutes as EnglishCraftSessionDuration,
  );
  const [questionSets, setQuestionSets] = useState<LiveGameQuestionSetCard[]>([]);
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<string | null>(null);
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [classesError, setClassesError] = useState<string | null>(null);

  const loadQuestionSets = useCallback(async () => {
    setSetsLoading(true);
    setSetsError(null);
    try {
      const sets = await fetchPublishedQuestionSets();
      setQuestionSets(sets);
      setSelectedQuestionSetId((current) => {
        if (current && sets.some((set) => set.id === current)) {
          return current;
        }
        return resolveInitialQuestionSetSelection(sets);
      });
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Could not load question sets.";
      setSetsError(message);
      setQuestionSets([]);
      setSelectedQuestionSetId(null);
    } finally {
      setSetsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuestionSets();
  }, [loadQuestionSets]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/live-game/classes", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { classes?: TeacherClassOption[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not load classes.");
        if (!cancelled) {
          const availableClasses = payload.classes ?? [];
          setClasses(availableClasses);
          setSelectedClassId((current) =>
            current && availableClasses.some((teacherClass) => teacherClass.id === current)
              ? current
              : "",
          );
        }
      })
      .catch((loadError) => {
        if (!cancelled) setClassesError(loadError instanceof Error ? loadError.message : "Could not load classes.");
      });
    return () => { cancelled = true; };
  }, []);

  const selectedSet =
    questionSets.find((set) => set.id === selectedQuestionSetId) ?? null;

  function handleSelectQuestionSet(id: string) {
    setSelectedQuestionSetId(id);
    writeLastSelectedQuestionSetId(id);
  }

  async function handleEditQuestionSet(id: string) {
    const card = questionSets.find((set) => set.id === id);
    if (!card) return;

    setEditingSetId(id);
    setError(null);
    try {
      const draftId =
        card.visibility === "system" ? (await duplicateQuestionSet(id)).id : id;
      router.push(`/live-game/question-sets/${draftId}/edit`);
    } catch (editError) {
      const message =
        editError instanceof Error ? editError.message : "Could not open question editor.";
      setError(message);
      setEditingSetId(null);
    }
  }

  async function handleCreate(questionSetId?: string) {
    const setId = questionSetId ?? selectedQuestionSetId;
    const name = displayName.trim();
    if (!name) {
      setError("Enter your name.");
      return;
    }
    if (!setId) {
      setError("Choose a question set.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    writeLastSelectedQuestionSetId(setId);

    try {
      const response = await fetch("/api/live-game/sessions/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          modeId: ENGLISH_CRAFT_MODE.id,
          durationMinutes,
          avatarId,
          questionSetId: setId,
          classId: selectedClassId || null,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        userId?: string;
        mapId?: string;
        durationMinutes?: number;
        questionSetId?: string;
        questionSetVersion?: number;
        classId?: string | null;
        classTitle?: string | null;
      };

      if (!response.ok || !payload.sessionId || !payload.userId) {
        throw new Error(payload.error ?? "Could not create a live game room.");
      }

      setLiveGameSessionContext({
        sessionId: payload.sessionId,
        role: "host",
        displayName: name,
        color: LIVE_GAME_DEFAULT_PLAYER_COLOR,
        userId: payload.userId,
        classId: payload.classId ?? null,
        classTitle: payload.classTitle ?? null,
        avatarId,
        modeId: ENGLISH_CRAFT_MODE.id,
        mapId: payload.mapId ?? ENGLISH_CRAFT_MODE.defaultMapId,
        durationMinutes: normalizeEnglishCraftDurationMinutes(
          payload.durationMinutes ?? durationMinutes ?? ENGLISH_CRAFT_MODE.defaultDurationMinutes,
        ),
        questionSetId: payload.questionSetId ?? setId,
        questionSetVersion: payload.questionSetVersion ?? selectedSet?.version ?? 1,
      });

      router.push(`/live-game/${payload.sessionId}`);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Could not create a live game room.";
      setError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <LiveGameLandingShell
      eyebrow="Teacher setup"
      title="Build a lively English session."
      description={`${ENGLISH_CRAFT_MODE.title}: ${ENGLISH_CRAFT_MODE.subtitle}. Choose the practice, invite your students, and play together.`}
      wide
    >
      <div>
          <h2 className="text-xl font-extrabold text-kid-ink">Room details</h2>
          <p className="mt-1 text-sm font-semibold text-kid-ink/70">
            Mode: {ENGLISH_CRAFT_MODE.title} — {ENGLISH_CRAFT_MODE.subtitle}
          </p>
      </div>

      <label className="block space-y-1">
          <span className="text-sm font-bold text-kid-ink">Your name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-lg font-semibold text-kid-ink"
          />
      </label>

      <label className="block space-y-1">
          <span className="text-sm font-bold text-kid-ink">Save this game to a class</span>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-lg font-semibold text-kid-ink"
          >
            <option value="">One-off game (no class project)</option>
            {classes.map((teacherClass) => (
              <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.title}</option>
            ))}
          </select>
          <span className="block text-xs font-semibold text-kid-ink/65">
            Class games add their completed rounds to that class&apos;s Live Game project.
          </span>
          {classesError ? <span className="block text-xs font-semibold text-red-700">{classesError}</span> : null}
      </label>

      <label className="block space-y-1">
          <span className="text-sm font-bold text-kid-ink">Session length (minutes)</span>
          <select
            value={formatEnglishCraftDurationSelectValue(durationMinutes)}
            onChange={(event) =>
              setDurationMinutes(parseEnglishCraftDurationSelectValue(event.target.value))
            }
            className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-lg font-semibold text-kid-ink"
          >
            {ENGLISH_CRAFT_DURATION_OPTIONS.map((mins) => (
              <option key={mins} value={mins}>
                {mins} minutes
              </option>
            ))}
          </select>
      </label>

      <LiveGameCharacterPicker value={avatarId} onChange={setAvatarId} />

      <div className="space-y-2">
          <span className="text-sm font-bold text-kid-ink">Question set</span>
          {setsLoading ?
            <p className="text-sm font-semibold text-kid-ink/70">Loading question sets...</p>
          : setsError ?
            <div className="space-y-2">
              <p className="text-sm font-semibold text-red-700">{setsError}</p>
              <KidButton variant="secondary" onClick={() => void loadQuestionSets()}>
                Retry
              </KidButton>
            </div>
          : questionSets.length === 0 ?
            <p className="text-sm font-semibold text-kid-ink/70">No published question sets.</p>
          : <>
              <LiveGameQuestionSetCarousel
                sets={questionSets}
                selectedId={selectedQuestionSetId}
                onSelect={handleSelectQuestionSet}
                onPlay={(id) => void handleCreate(id)}
                onEdit={(id) => void handleEditQuestionSet(id)}
                disabled={isSubmitting}
                editingId={editingSetId}
              />
              {selectedSet ?
                <p className="text-sm font-semibold text-kid-ink/70">
                  Selected: {selectedSet.learningObjective}
                </p>
              : null}
            </>
          }
      </div>

      {error ?
        <p className="text-sm font-semibold text-red-700">{error}</p>
      : null}

      <KidButton
          variant="primary"
          disabled={isSubmitting || setsLoading || !selectedQuestionSetId}
          onClick={() => void handleCreate()}
        >
          {isSubmitting ? "Creating..." : "Create English Craft room"}
      </KidButton>
    </LiveGameLandingShell>
  );
}
