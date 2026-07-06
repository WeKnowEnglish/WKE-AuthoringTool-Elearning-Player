"use client";

import { KidPanel } from "@/components/kid-ui/KidPanel";
import { clsx } from "clsx";
import { useCallback, useEffect, useState } from "react";
import { LevelUpModal } from "@/components/progress/LevelUpModal";
import { ExploreChapterOverlay } from "@/components/student-hub/ExploreChapterOverlay";
import { VocabularySetOverlay } from "@/components/teststartpage/VocabularySetOverlay";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import { HomeRoom } from "@/components/student-hub/HomeRoom";
import { LearnRoom } from "@/components/student-hub/LearnRoom";
import { GardenRoom } from "@/components/garden/GardenRoom";
import { GardenLockedPanel } from "@/components/garden/GardenLockedPanel";
import { PetRoom } from "@/components/student-hub/PetRoom";
import { CollectionBookRoom } from "@/components/student-hub/CollectionBookRoom";
import { parseCollectionPageId, type CollectionPageId } from "@/components/student-hub/collection/types";
import { RoomSwitcher, type StudentHubRoom } from "@/components/student-hub/RoomSwitcher";
import { DailyQuestsDrawer } from "@/components/student-hub/DailyQuestsDrawer";
import { QuestHeaderButton } from "@/components/student-hub/QuestHeaderButton";
import { SignOutForm } from "@/components/auth/SignOutForm";
import { SoundMuteButton } from "@/components/kid-ui/SoundMuteButton";
import { StudentEconomyHud } from "@/components/student-hub/StudentEconomyHud";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import { playSfx } from "@/lib/audio/sfx";
import { completeStudyCareIfPending, isStudyCarePending } from "@/lib/pet";
import { getPlayerLevel, getRewards } from "@/lib/progress/rewards";
import { isUnlockAvailable } from "@/lib/progress/unlock-registry";
import { newSessionSeed } from "@/lib/student-hub/session-seed";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import { markExplorationNode } from "@/lib/worlds/exploration";
import type { VocabSetId } from "@/lib/vocabulary-templates";
import { subscribePracticeEvents } from "@/lib/student-session";

type Props = {
  initialCollectionPage?: string | null;
  initialRoom?: string | null;
};

function parseInitialRoom(room: string | null | undefined, hasCollectionPage: boolean): StudentHubRoom {
  if (hasCollectionPage) return "book";
  if (room === "learn" || room === "pet" || room === "garden" || room === "book") return room;
  return "home";
}

export function StudentHubClient({ initialCollectionPage = null, initialRoom = null }: Props) {
  const hydrated = useClientHydrated();
  const initialBook = Boolean(initialCollectionPage);
  const [room, setRoom] = useState<StudentHubRoom>(() =>
    parseInitialRoom(initialRoom, initialBook),
  );
  const [collectionPage, setCollectionPage] = useState<CollectionPageId>(() =>
    parseCollectionPageId(initialCollectionPage),
  );
  const { muted } = useAudioMuted();
  const [rewardsUi, setRewardsUi] = useState({
    gold: 0,
    experience: 0,
    level: 1,
  });
  const [dailyQuestUiKey, setDailyQuestUiKey] = useState(0);
  const [explorationUiKey, setExplorationUiKey] = useState(0);
  const [petUiKey, setPetUiKey] = useState(0);
  const [gardenUiKey, setGardenUiKey] = useState(0);
  const [studyPendingUi, setStudyPendingUi] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [vocabSetOpen, setVocabSetOpen] = useState(false);
  const [activeVocabSetId, setActiveVocabSetId] = useState<VocabSetId | null>(null);
  const [vocabSessionSeed, setVocabSessionSeed] = useState<string | null>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [activeExploreAreaId, setActiveExploreAreaId] = useState<ExploreAreaId | null>(null);
  const [exploreSessionSeed, setExploreSessionSeed] = useState<string | null>(null);
  const [gardenLockMessage, setGardenLockMessage] = useState<string | null>(null);

  const gardenUnlocked = isUnlockAvailable("language_garden", rewardsUi.level);

  const showGardenLockMessage = useCallback(() => {
    setGardenLockMessage("Language Garden unlocks at level 2. Keep learning!");
  }, []);

  useEffect(() => {
    if (!gardenLockMessage) return;
    const id = window.setTimeout(() => setGardenLockMessage(null), 5000);
    return () => window.clearTimeout(id);
  }, [gardenLockMessage]);

  const refreshRewardsUi = useCallback(() => {
    const r = getRewards();
    setRewardsUi({
      gold: r.gold,
      experience: r.experience,
      level: getPlayerLevel(r),
    });
    setDailyQuestUiKey((k) => k + 1);
  }, []);

  const refreshExplorationUi = useCallback(() => {
    setExplorationUiKey((k) => k + 1);
  }, []);

  const refreshStudyPendingUi = useCallback(() => {
    if (typeof window === "undefined") return;
    setStudyPendingUi(isStudyCarePending());
    setPetUiKey((k) => k + 1);
  }, []);

  useEffect(() => {
    refreshRewardsUi();
    refreshStudyPendingUi();
  }, [refreshRewardsUi, refreshStudyPendingUi]);

  useEffect(() => {
    return subscribePracticeEvents((event) => {
      if (event.type === "reward_awarded" || event.type === "session_completed") {
        refreshRewardsUi();
      }
      if (event.type === "session_completed" && event.result === "completed") {
        refreshExplorationUi();
        refreshStudyPendingUi();
      }
    });
  }, [refreshExplorationUi, refreshRewardsUi, refreshStudyPendingUi]);

  useEffect(() => {
    if (!hydrated) return;
    if (room === "garden" && !isUnlockAvailable("language_garden", rewardsUi.level)) {
      setRoom("home");
      showGardenLockMessage();
    }
  }, [hydrated, room, rewardsUi.level, showGardenLockMessage]);

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

  const openExplore = useCallback(
    (areaId: ExploreAreaId) => {
      if (!isUnlockAvailable("explore_run", rewardsUi.level)) {
        playSfx("wrong", muted);
        return;
      }
      playSfx("tap", muted);
      setActiveExploreAreaId(areaId);
      setExploreSessionSeed(newSessionSeed());
      setExploreOpen(true);
    },
    [muted, rewardsUi.level],
  );

  const openVocabularySet = useCallback(
    (id: VocabSetId) => {
      const unlockId = `vocab_set:${id}` as const;
      if (!isUnlockAvailable(unlockId, rewardsUi.level)) {
        playSfx("wrong", muted);
        return;
      }
      playSfx("tap", muted);
      markExplorationNode({ kind: "vocab_set", setId: id });
      refreshExplorationUi();
      setActiveVocabSetId(id);
      setVocabSessionSeed(newSessionSeed());
      setVocabSetOpen(true);
    },
    [muted, rewardsUi.level, refreshExplorationUi],
  );

  const goLearn = useCallback(() => {
    playSfx("tap", muted);
    setRoom("learn");
    refreshStudyPendingUi();
  }, [muted, refreshStudyPendingUi]);

  const goHome = useCallback(() => {
    playSfx("tap", muted);
    setRoom("home");
    refreshExplorationUi();
  }, [muted, refreshExplorationUi]);

  const goPet = useCallback(() => {
    playSfx("tap", muted);
    setRoom("pet");
    refreshStudyPendingUi();
  }, [muted, refreshStudyPendingUi]);

  const goGarden = useCallback(() => {
    if (!isUnlockAvailable("language_garden", rewardsUi.level)) {
      playSfx("wrong", muted);
      showGardenLockMessage();
      return;
    }
    playSfx("tap", muted);
    setRoom("garden");
    setGardenUiKey((k) => k + 1);
  }, [muted, rewardsUi.level, showGardenLockMessage]);

  const openCollection = useCallback(
    (page: CollectionPageId = "stickers") => {
      playSfx("tap", muted);
      setCollectionPage(page);
      setRoom("book");
    },
    [muted],
  );

  const goBook = useCallback(() => {
    openCollection("stickers");
  }, [openCollection]);

  const onRoomChange = useCallback(
    (next: StudentHubRoom) => {
      if (next === "garden" && !isUnlockAvailable("language_garden", rewardsUi.level)) {
        playSfx("wrong", muted);
        showGardenLockMessage();
        return;
      }
      setRoom(next);
      if (next === "home") refreshExplorationUi();
      if (next === "garden") setGardenUiKey((k) => k + 1);
      refreshStudyPendingUi();
    },
    [muted, rewardsUi.level, refreshExplorationUi, refreshStudyPendingUi, showGardenLockMessage],
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
        room === "book" || room === "garden" ?
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
            showLevelBar={room !== "book"}
          />
        ) : (
          <div className="h-9 min-w-[8rem] flex-1 rounded-lg border-2 border-kid-ink/30 bg-kid-panel/50" aria-hidden />
        )}
        <div className="flex items-center gap-2">
          <SoundMuteButton className="!min-h-9 shrink-0" />
          <QuestHeaderButton
            muted={muted}
            hydrated={hydrated}
            dailyQuestUiKey={dailyQuestUiKey}
            expanded={questsOpen}
            onClick={toggleQuests}
          />
          <SignOutForm variant="kid" />
        </div>
      </header>

      {gardenLockMessage ?
        <KidPanel className="mx-3 mt-2 shrink-0 p-2 text-center" tone="discovery">
          <p className="text-sm font-bold text-kid-ink" role="status" aria-live="polite">
            {gardenLockMessage}
          </p>
        </KidPanel>
      : null}

      <main
        className={clsx(
          room === "book" ?
            "flex h-0 min-h-0 flex-1 flex-col overflow-hidden px-1 pt-0.5 sm:px-2"
          : room === "garden" ?
            "flex min-h-0 flex-1 flex-col overflow-hidden px-1 pt-0 pb-24 md:px-2 md:pt-1"
          : "min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28",
        )}
      >
        {room === "home" ?
          <HomeRoom
            muted={muted}
            experience={rewardsUi.experience}
            hydrated={hydrated}
            dailyQuestUiKey={dailyQuestUiKey}
            explorationUiKey={explorationUiKey}
            gardenUiKey={gardenUiKey}
            playerLevel={rewardsUi.level}
            onGoLearn={goLearn}
            onGoPet={goPet}
            onGoGarden={goGarden}
            onOpenCollection={openCollection}
            onOpenExplore={openExplore}
          />
        : room === "pet" ?
          <PetRoom
            muted={muted}
            petUiKey={petUiKey}
            onGoLearn={goLearn}
            onGoHome={goHome}
            onEconomyChange={refreshRewardsUi}
          />
        : room === "garden" ?
          gardenUnlocked ?
            <GardenRoom muted={muted} gardenUiKey={gardenUiKey} onEconomyChange={refreshRewardsUi} />
          : <GardenLockedPanel playerLevel={rewardsUi.level} onGoLearn={goLearn} />
        : room === "learn" ?
          <LearnRoom
            playerLevel={rewardsUi.level}
            muted={muted}
            studyCarePending={studyPendingUi}
            onOpenVocabularySet={openVocabularySet}
            onExplorationChange={refreshExplorationUi}
          />
        : <CollectionBookRoom
            muted={muted}
            experience={rewardsUi.experience}
            dailyQuestUiKey={dailyQuestUiKey}
            explorationUiKey={explorationUiKey}
            initialPage={collectionPage}
            onRewardsChange={refreshRewardsUi}
            className="min-h-0 flex-1"
          />
        }
      </main>

      <RoomSwitcher
        room={room}
        muted={muted}
        playerLevel={rewardsUi.level}
        onRoomChange={onRoomChange}
        onGardenLocked={showGardenLockMessage}
        dock={room === "book" ? "inline" : "fixed"}
      />

      <DailyQuestsDrawer
        open={questsOpen}
        muted={muted}
        dailyQuestUiKey={dailyQuestUiKey}
        onClose={closeQuests}
        onEconomyChange={refreshRewardsUi}
      />

      {exploreOpen && activeExploreAreaId && exploreSessionSeed ?
        <ExploreChapterOverlay
          areaId={activeExploreAreaId}
          sessionSeed={exploreSessionSeed}
          muted={muted}
          onEconomyChange={() => {
            refreshRewardsUi();
            refreshExplorationUi();
          }}
          onOpenCollection={(page) => {
            openCollection(page);
          }}
          onClose={() => {
            playSfx("tap", muted);
            setExploreOpen(false);
            setActiveExploreAreaId(null);
            setExploreSessionSeed(null);
            refreshRewardsUi();
            refreshExplorationUi();
          }}
        />
      : null}

      {vocabSetOpen && activeVocabSetId && vocabSessionSeed ?
        <VocabularySetOverlay
          setId={activeVocabSetId}
          sessionSeed={vocabSessionSeed}
          muted={muted}
          onEconomyChange={refreshRewardsUi}
          onRequestNewRun={() => setVocabSessionSeed(newSessionSeed())}
          onActivityComplete={() => {
            if (activeVocabSetId) {
              markExplorationNode({ kind: "vocab_set", setId: activeVocabSetId });
            }
            refreshExplorationUi();
            handleLearnActivityComplete();
          }}
          onClose={() => {
            playSfx("tap", muted);
            setVocabSetOpen(false);
            setActiveVocabSetId(null);
            setVocabSessionSeed(null);
            setRoom("learn");
            refreshRewardsUi();
            refreshExplorationUi();
            refreshStudyPendingUi();
          }}
        />
      : null}
    </div>
  );
}
