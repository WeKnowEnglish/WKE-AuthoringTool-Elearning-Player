"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useState } from "react";
import { LevelUpModal } from "@/components/progress/LevelUpModal";
import { VocabularySetOverlay } from "@/components/teststartpage/VocabularySetOverlay";
import { HomeRoom } from "@/components/student-hub/HomeRoom";
import { LearnRoom } from "@/components/student-hub/LearnRoom";
import { PetRoom } from "@/components/student-hub/PetRoom";
import { StickerBookRoom } from "@/components/student-hub/StickerBookRoom";
import { RoomSwitcher, type StudentHubRoom } from "@/components/student-hub/RoomSwitcher";
import { DailyQuestsDrawer } from "@/components/student-hub/DailyQuestsDrawer";
import { QuestHeaderButton } from "@/components/student-hub/QuestHeaderButton";
import { StudentEconomyHud } from "@/components/student-hub/StudentEconomyHud";
import { playSfx } from "@/lib/audio/sfx";
import { completeStudyCareIfPending, isStudyCarePending } from "@/lib/pet";
import { getProgressSnapshot } from "@/lib/progress/local-storage";
import { getPlayerLevel, getRewards } from "@/lib/progress/rewards";
import { isUnlockAvailable } from "@/lib/progress/unlock-registry";
import { newSessionSeed } from "@/lib/student-hub/session-seed";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import type { VocabSetId } from "@/lib/vocabulary-templates";

export function StudentHubClient() {
  const hydrated = useClientHydrated();
  const [room, setRoom] = useState<StudentHubRoom>("home");
  const [muted, setMuted] = useState(false);
  const [rewardsUi, setRewardsUi] = useState({
    gold: 0,
    experience: 0,
    level: 1,
  });
  const [dailyQuestUiKey, setDailyQuestUiKey] = useState(0);
  const [petUiKey, setPetUiKey] = useState(0);
  const [studyPendingUi, setStudyPendingUi] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [vocabSetOpen, setVocabSetOpen] = useState(false);
  const [activeVocabSetId, setActiveVocabSetId] = useState<VocabSetId | null>(null);
  const [vocabSessionSeed, setVocabSessionSeed] = useState<string | null>(null);

  const refreshRewardsUi = useCallback(() => {
    const r = getRewards();
    setRewardsUi({
      gold: r.gold,
      experience: r.experience,
      level: getPlayerLevel(r),
    });
    setDailyQuestUiKey((k) => k + 1);
  }, []);

  const refreshStudyPendingUi = useCallback(() => {
    if (typeof window === "undefined") return;
    setStudyPendingUi(isStudyCarePending());
    setPetUiKey((k) => k + 1);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMuted(getProgressSnapshot().audioMuted === true));
  }, []);

  useEffect(() => {
    refreshRewardsUi();
    refreshStudyPendingUi();
  }, [refreshRewardsUi, refreshStudyPendingUi]);

  useEffect(() => {
    if (room !== "book") return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [room]);

  const openVocabularySet = useCallback(
    (id: VocabSetId) => {
      const unlockId = `vocab_set:${id}` as const;
      if (!isUnlockAvailable(unlockId, rewardsUi.level)) {
        playSfx("wrong", muted);
        return;
      }
      playSfx("tap", muted);
      setActiveVocabSetId(id);
      setVocabSessionSeed(newSessionSeed());
      setVocabSetOpen(true);
    },
    [muted, rewardsUi.level],
  );

  const goLearn = useCallback(() => {
    playSfx("tap", muted);
    setRoom("learn");
    refreshStudyPendingUi();
  }, [muted, refreshStudyPendingUi]);

  const goHome = useCallback(() => {
    playSfx("tap", muted);
    setRoom("home");
  }, [muted]);

  const goPet = useCallback(() => {
    playSfx("tap", muted);
    setRoom("pet");
    refreshStudyPendingUi();
  }, [muted, refreshStudyPendingUi]);

  const goBook = useCallback(() => {
    playSfx("tap", muted);
    setRoom("book");
  }, [muted]);

  const onRoomChange = useCallback(
    (next: StudentHubRoom) => {
      setRoom(next);
      refreshStudyPendingUi();
    },
    [refreshStudyPendingUi],
  );

  const handleLearnActivityComplete = useCallback(() => {
    if (completeStudyCareIfPending()) {
      playSfx("correct", muted);
      refreshStudyPendingUi();
      setRoom("pet");
    }
  }, [muted, refreshStudyPendingUi]);

  const closeQuests = useCallback(() => {
    setQuestsOpen(false);
  }, []);

  const toggleQuests = useCallback(() => {
    setQuestsOpen((open) => !open);
  }, []);

  return (
    <div
      className={clsx(
        "flex flex-col bg-[#f7bf4d] text-kid-ink",
        room === "book" ?
          "h-svh max-h-svh overflow-hidden overscroll-none"
        : "min-h-dvh",
      )}
    >
      <LevelUpModal muted={muted} />
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b-4 border-kid-ink bg-[#d8871f] px-3 py-2">
        <p className="w-full text-center text-sm font-extrabold uppercase tracking-wide text-kid-ink sm:w-auto sm:text-left">
          We Know English
        </p>
        {hydrated ? (
          <StudentEconomyHud
            gold={rewardsUi.gold}
            experience={rewardsUi.experience}
            showLevelBar={room !== "home"}
          />
        ) : (
          <div className="h-9 min-w-[8rem] flex-1 rounded-lg border-2 border-kid-ink/30 bg-kid-panel/50" aria-hidden />
        )}
        <QuestHeaderButton
          muted={muted}
          hydrated={hydrated}
          dailyQuestUiKey={dailyQuestUiKey}
          expanded={questsOpen}
          onClick={toggleQuests}
        />
      </header>

      <main
        className={clsx(
          room === "book" ?
            "flex h-0 min-h-0 flex-1 flex-col overflow-hidden px-1 pt-0.5 sm:px-2"
          : "min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28",
        )}
      >
        {room === "home" ?
          <HomeRoom
            muted={muted}
            experience={rewardsUi.experience}
            hydrated={hydrated}
            dailyQuestUiKey={dailyQuestUiKey}
            onGoLearn={goLearn}
            onGoPet={goPet}
            onGoBook={goBook}
          />
        : room === "pet" ?
          <PetRoom
            muted={muted}
            petUiKey={petUiKey}
            playerLevel={rewardsUi.level}
            onGoLearn={goLearn}
            onGoHome={goHome}
            onEconomyChange={refreshRewardsUi}
          />
        : room === "learn" ?
          <LearnRoom
            playerLevel={rewardsUi.level}
            muted={muted}
            studyCarePending={studyPendingUi}
            onOpenVocabularySet={openVocabularySet}
          />
        : <StickerBookRoom
            muted={muted}
            dailyQuestUiKey={dailyQuestUiKey}
            className="min-h-0 flex-1"
          />
        }
      </main>

      <RoomSwitcher
        room={room}
        muted={muted}
        onRoomChange={onRoomChange}
        dock={room === "book" ? "inline" : "fixed"}
      />

      <DailyQuestsDrawer
        open={questsOpen}
        muted={muted}
        dailyQuestUiKey={dailyQuestUiKey}
        onClose={closeQuests}
        onEconomyChange={refreshRewardsUi}
      />

      {vocabSetOpen && activeVocabSetId && vocabSessionSeed ?
        <VocabularySetOverlay
          setId={activeVocabSetId}
          sessionSeed={vocabSessionSeed}
          muted={muted}
          onEconomyChange={refreshRewardsUi}
          onRequestNewRun={() => setVocabSessionSeed(newSessionSeed())}
          onActivityComplete={handleLearnActivityComplete}
          onClose={() => {
            playSfx("tap", muted);
            setVocabSetOpen(false);
            setActiveVocabSetId(null);
            setVocabSessionSeed(null);
            setRoom("learn");
            refreshRewardsUi();
            refreshStudyPendingUi();
          }}
        />
      : null}
    </div>
  );
}
