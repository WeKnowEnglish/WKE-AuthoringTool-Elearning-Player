"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FlashcardsView } from "@/components/lesson/interactions/FlashcardsView";
import { LetterMixupView } from "@/components/lesson/interactions/LetterMixupView";
import { McQuizView } from "@/components/lesson/interactions/McQuizView";
import { MasteryScoreBar } from "@/components/teacher/mastery/MasteryUiPrimitives";
import { resolveLandingDemoMedia } from "@/lib/actions/landing-demo-media";
import type { LandingDemoMediaMatch } from "@/lib/actions/landing-demo-media";
import {
  compileQuizzesFromVocabList,
  type VocabCompileFormat,
  type VocabCompileResult,
} from "@/lib/activity-builder/games/compile-from-vocab-list";
import type { GamesAuthoringDocument } from "@/lib/activity-builder/games/types-mc";
import { exportGamesMcQuizForLessonPlayer } from "@/lib/activity-builder/games/mc-quiz";
import type { GamesFlashcardsAuthoringDocument } from "@/lib/activity-builder/games/types-flashcards";
import { exportGamesFlashcardsForLessonPlayer } from "@/lib/activity-builder/games/flashcards";
import type { GamesLetterMixupAuthoringDocument } from "@/lib/activity-builder/games/types-letter-mixup";
import { exportGamesLetterMixupForLessonPlayer } from "@/lib/activity-builder/games/letter-mixup";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import type { ScreenPayload } from "@/lib/lesson-schemas";

type DemoStage = "vocabulary" | "quiz" | "publish" | "student" | "report";
type Destination = "homework" | "wall";

const STAGES: Array<{ id: DemoStage; short: string }> = [
  { id: "vocabulary", short: "Words" },
  { id: "quiz", short: "Activity" },
  { id: "publish", short: "Class" },
  { id: "student", short: "Try it" },
  { id: "report", short: "Report" },
];
const DEFAULT_WORDS = ["sunny", "rainy", "windy", "cloudy"];
const FORMATS: Array<{ id: VocabCompileFormat; label: string; detail: string }> = [
  { id: "multiple_choice", label: "Multiple choice", detail: "Choose the matching word" },
  { id: "flashcards", label: "Flashcards", detail: "Flip and self-check" },
  { id: "letter_mixup", label: "Spelling scramble", detail: "Rebuild each word" },
];

function demoMediaUrl(word: string, index: number) {
  const icons: Record<string, string> = { sunny: "☀", rainy: "☂", windy: "〰", cloudy: "☁" };
  const palettes = [["#fff7d6", "#f59e0b"], ["#e0f2fe", "#0284c7"], ["#ecfeff", "#0891b2"], ["#f1f5f9", "#64748b"]];
  const [background, accent] = palettes[index % palettes.length]!;
  const icon = icons[word.trim().toLowerCase()] ?? (word.trim().slice(0, 1).toUpperCase() || "?");
  const safeWord = word.trim().replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" rx="44" fill="${background}"/><circle cx="320" cy="175" r="112" fill="white" opacity=".78"/><text x="320" y="225" text-anchor="middle" font-size="150" font-family="Arial" fill="${accent}">${icon}</text><text x="320" y="350" text-anchor="middle" font-size="38" font-weight="700" font-family="Arial" fill="#1c1917">${safeWord}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function TeacherPanel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">{children}</div>;
}

export function LandingTeacherWorkflow() {
  const [stage, setStage] = useState<DemoStage>("vocabulary");
  const [listName, setListName] = useState("Weather words");
  const [words, setWords] = useState(DEFAULT_WORDS);
  const [format, setFormat] = useState<VocabCompileFormat>("multiple_choice");
  const [compiled, setCompiled] = useState<VocabCompileResult | null>(null);
  const [homeworkTitle, setHomeworkTitle] = useState("Weather words practice");
  const [assignHomework, setAssignHomework] = useState(true);
  const [postToWall, setPostToWall] = useState(false);
  const [published, setPublished] = useState(false);
  const [destination, setDestination] = useState<Destination>("homework");
  const [itemIndex, setItemIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [screenPassed, setScreenPassed] = useState(false);
  const [matchingMedia, setMatchingMedia] = useState(false);
  const [wallPlays, setWallPlays] = useState(24);
  const activityTitle = `${listName.trim() || "My vocabulary"} practice`;

  useEffect(() => {
    setHomeworkTitle(activityTitle);
  }, [activityTitle]);

  const document = compiled?.document ?? null;
  const mcItems = document?.interaction.format === "multiple_choice" ? (document as GamesAuthoringDocument).interaction.items : [];
  const letterItems = document?.interaction.format === "letter_mixup" ? (document as GamesLetterMixupAuthoringDocument).interaction.items : [];
  const flashcards = document?.interaction.format === "flashcards" ? (document as GamesFlashcardsAuthoringDocument).interaction.cards : [];
  const activityItems = document?.interaction.format === "multiple_choice" ? mcItems : document?.interaction.format === "letter_mixup" ? letterItems : flashcards;
  const currentItem = activityItems[itemIndex];
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter(Boolean).length;
  const score = answeredCount ? correctCount / answeredCount : 0;
  const currentFormat = FORMATS.find((item) => item.id === format)!;
  const wallAverage = Math.round((78 * 24 + score * 100) / (24 + (answeredCount ? 1 : 0)));
  const wallHighest = Math.max(94, Math.round(score * 100));

  const availableStages = useMemo(() => new Set<DemoStage>([
    "vocabulary",
    ...(compiled ? (["quiz", "publish"] as DemoStage[]) : []),
    ...(published ? (["student", "report"] as DemoStage[]) : []),
  ]), [compiled, published]);

  function invalidate() {
    setCompiled(null);
    setPublished(false);
    setAnswers({});
    setItemIndex(0);
  }

  function patchWord(index: number, value: string) {
    setWords((current) => current.map((word, wordIndex) => wordIndex === index ? value : word));
    invalidate();
  }

  async function generateActivity() {
    const cleanWords = words.map((word) => word.trim()).filter(Boolean);
    if (cleanWords.length < 2) return;
    setMatchingMedia(true);
    let matched: Record<string, LandingDemoMediaMatch> = {};
    try {
      matched = await resolveLandingDemoMedia(cleanWords);
    } catch {
      matched = {};
    } finally {
      setMatchingMedia(false);
    }
    const entries = words.map((word, index) => ({
      id: `demo-word-${index + 1}`,
      word: word.trim(),
      imageUrl: matched[word.trim()]?.imageUrl || demoMediaUrl(word, index),
      audioUrl: matched[word.trim()]?.audioUrl || undefined,
    })).filter((entry) => entry.word);
    const list: VocabularyListDocument = { version: 1, kind: "vocabulary-list", id: "homepage-demo", name: listName.trim() || "My vocabulary", cefr: "A1", entries };
    const output = compileQuizzesFromVocabList({
      list,
      formats: [format],
      mcMasterQuestion: "Which word matches the picture?",
      mcOptionCount: Math.min(4, entries.length),
      mcShuffleOptions: true,
      mcStableItems: true,
      letterShuffleLetters: true,
      flashcardsFrontFaces: ["picture"],
      flashcardsBackFaces: ["word"],
      flashcardsShuffleCards: false,
    });
    setCompiled(output.results[0] ?? null);
    setAnswers({});
    setItemIndex(0);
    setScreenPassed(false);
    setPublished(false);
    setStage("quiz");
  }

  function publishActivity() {
    if (!compiled || (!assignHomework && !postToWall)) return;
    setPublished(true);
    setDestination(assignHomework ? "homework" : "wall");
    if (postToWall) setWallPlays((value) => value + 1);
    setStage("student");
  }

  function resetDemo() {
    setStage("vocabulary"); setListName("Weather words"); setWords(DEFAULT_WORDS); setFormat("multiple_choice");
    setCompiled(null); setHomeworkTitle("Weather words practice"); setAssignHomework(true); setPostToWall(false);
    setPublished(false); setDestination("homework"); setItemIndex(0); setAnswers({}); setScreenPassed(false);
    setMatchingMedia(false); setWallPlays(24);
  }

  const playerScreens = (() => {
    if (!document) return [] as ScreenPayload[];
    if (document.interaction.format === "multiple_choice") {
      return exportGamesMcQuizForLessonPlayer(document as GamesAuthoringDocument).screens as ScreenPayload[];
    }
    if (document.interaction.format === "letter_mixup") {
      return exportGamesLetterMixupForLessonPlayer(document as GamesLetterMixupAuthoringDocument).screens as ScreenPayload[];
    }
    return exportGamesFlashcardsForLessonPlayer(document as GamesFlashcardsAuthoringDocument).screens as ScreenPayload[];
  })();
  const currentScreen = playerScreens[itemIndex] ?? null;

  function compiledImageAt(index: number) {
    if (document?.interaction.format === "multiple_choice") return mcItems[index]?.imageUrl;
    if (document?.interaction.format === "letter_mixup") return letterItems[index]?.imageUrl;
    if (document?.interaction.format === "flashcards") return flashcards[index]?.faces.pictureUrl;
    return undefined;
  }

  function passCurrentScreen() {
    setScreenPassed(true);
    if (!currentScreen) return;
    if (currentScreen.type === "interaction" && currentScreen.subtype === "flashcards") {
      setAnswers(Object.fromEntries(activityItems.map((item) => [item.id, true])));
    } else if (currentItem) {
      setAnswers((current) => ({ ...current, [currentItem.id]: true }));
    }
  }

  function markCurrentWrong() {
    if (currentItem) setAnswers((current) => ({ ...current, [currentItem.id]: false }));
  }

  function advancePlayer() {
    if (itemIndex + 1 < playerScreens.length) {
      setItemIndex((value) => value + 1);
      setScreenPassed(false);
      return;
    }
    if (destination === "wall") setWallPlays((value) => value + 1);
    setStage("report");
  }

  function backPlayer() {
    if (itemIndex === 0) return;
    setItemIndex((value) => value - 1);
    setScreenPassed(false);
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border-2 border-stone-200 bg-stone-50 shadow-[0_18px_45px_rgba(20,36,94,0.1)]">
      <div className="border-b border-stone-200 bg-white px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">For teachers</p><h3 className="mt-1 text-xl font-semibold text-stone-900 sm:text-2xl">Create and share a lesson in under a minute</h3><p className="mt-1 max-w-2xl text-sm text-stone-600">Add words, match media, choose an activity, publish it, and watch the report update.</p></div><div className="flex items-center gap-2 text-xs text-stone-500"><span className="size-2 rounded-full bg-emerald-500" />Private demo · nothing is saved</div></div>
      </div>

      <div className="border-b border-stone-200 bg-white px-2 py-3 sm:overflow-x-auto sm:px-5"><div className="grid grid-cols-5 gap-1 sm:min-w-[38rem] sm:gap-2" role="tablist" aria-label="Lesson creation demo">{STAGES.map((item, index) => { const active = stage === item.id; return <button key={item.id} type="button" role="tab" aria-selected={active} disabled={!availableStages.has(item.id)} onClick={() => setStage(item.id)} className={`min-w-0 rounded-lg border px-1 py-2 text-center transition sm:rounded-xl sm:px-3 sm:text-left ${active ? "border-sky-300 bg-sky-50 text-sky-950" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"} disabled:cursor-not-allowed disabled:opacity-40`}><span className="text-[9px] font-bold uppercase tracking-wide sm:text-[10px]">{index + 1}</span><span className="mt-0.5 block truncate text-[11px] font-semibold sm:text-sm">{item.short}</span></button>; })}</div></div>

      <div className="p-2.5 sm:min-h-[35rem] sm:p-5 lg:p-6"><div key={`${stage}-${destination}`} className="teacher-workflow-preview-motion">
        {stage === "vocabulary" ? <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
          <TeacherPanel><div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><label className="text-xs font-medium uppercase tracking-wide text-stone-500" htmlFor="demo-list-name">Vocabulary list</label><input id="demo-list-name" value={listName} onChange={(event) => { setListName(event.target.value); invalidate(); }} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base font-semibold text-stone-900 outline-none focus:border-sky-400" /><p className="mt-1 text-xs text-stone-500">A1 · Media matched automatically</p></div><button type="button" onClick={() => void generateActivity()} disabled={matchingMedia || words.filter((word) => word.trim()).length < 2} className="w-full rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40 sm:w-auto sm:py-2">{matchingMedia ? "Finding pictures…" : "Generate activity →"}</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{words.map((word, index) => <div key={index} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3"><div className="size-12 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white"><Image src={demoMediaUrl(word, index)} alt="" width={48} height={48} unoptimized className="h-full w-full object-cover" /></div><div className="min-w-0 flex-1"><label className="text-[10px] font-bold uppercase tracking-wide text-stone-500" htmlFor={`demo-word-${index}`}>Word {index + 1}</label><input id={`demo-word-${index}`} value={word} onChange={(event) => patchWord(index, event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900" /></div></div>)}</div><button type="button" onClick={() => { setWords((current) => [...current, ""]); invalidate(); }} disabled={words.length >= 6} className="mt-4 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:opacity-40 sm:w-auto">+ Add another word</button></TeacherPanel>
          <TeacherPanel><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Choose the activity</p><div className="mt-4 space-y-3">{FORMATS.map((item) => <button key={item.id} type="button" onClick={() => { setFormat(item.id); invalidate(); }} className={`w-full rounded-xl border p-4 text-left ${format === item.id ? "border-sky-400 bg-sky-50" : "border-stone-200 bg-white"}`}><span className="font-semibold text-stone-900">{item.label}</span><span className="mt-1 block text-xs text-stone-500">{item.detail}</span></button>)}</div><div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"><strong>Media match ready.</strong> Each image is passed into the same activity compiler used by the teacher builder.</div></TeacherPanel>
        </div> : null}

        {stage === "quiz" && compiled ? <TeacherPanel><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Activity builder · {currentFormat.label}</p><h4 className="mt-1 text-lg font-semibold text-stone-900">{compiled.document.name}</h4><p className="text-sm text-stone-500">{compiled.itemCount} items · images added from Media</p></div><button type="button" onClick={() => setStage("publish")} className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white sm:w-auto sm:py-2">Connect to class →</button></div><div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">{words.filter(Boolean).map((word, index) => <article key={`${word}-${index}`} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50"><div className="aspect-[8/5] bg-stone-100 p-2"><Image src={compiledImageAt(index) || demoMediaUrl(word, index)} alt={`Matched illustration for ${word}`} width={640} height={400} unoptimized className="h-full w-full object-contain" /></div><div className="p-2.5 sm:p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 sm:text-[10px]">Media matched</p><p className="mt-1 truncate text-sm font-semibold text-stone-900 sm:text-base">{word}</p></div></article>)}</div></TeacherPanel> : null}

        {stage === "publish" && compiled ? <div className="grid gap-4 lg:grid-cols-[1fr_.85fr]"><TeacherPanel><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Class 4A · 18 students</p><h4 className="mt-1 text-lg font-semibold text-stone-900">Where should students find it?</h4><label className="mt-5 block text-xs font-medium text-stone-600" htmlFor="demo-homework-title">Activity title</label><input id="demo-homework-title" value={homeworkTitle} onChange={(event) => setHomeworkTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900" /><div className="mt-5 space-y-3"><label className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-200 p-4"><span><strong className="block text-sm text-stone-900">Assign as homework</strong><span className="text-xs text-stone-500">Track each student’s answers and mastery</span></span><input type="checkbox" checked={assignHomework} onChange={(event) => setAssignHomework(event.target.checked)} className="size-5 accent-emerald-700" /></label><label className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-200 p-4"><span><strong className="block text-sm text-stone-900">Post to classroom wall</strong><span className="text-xs text-stone-500">Let students play from the class feed</span></span><input type="checkbox" checked={postToWall} onChange={(event) => setPostToWall(event.target.checked)} className="size-5 accent-sky-700" /></label></div><button type="button" disabled={!assignHomework && !postToWall} onClick={publishActivity} className="mt-5 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Publish to Class 4A →</button></TeacherPanel><TeacherPanel><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Classroom preview</p><div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4"><div className="flex gap-2">{assignHomework ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase text-amber-900">Homework</span> : null}{postToWall ? <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase text-sky-900">Wall post</span> : null}</div><h5 className="mt-3 font-semibold text-stone-900">{homeworkTitle}</h5><p className="mt-1 text-sm text-stone-600">{currentFormat.label} · {compiled.itemCount} items</p><p className="mt-4 text-xs text-stone-500">Ready to publish</p></div></TeacherPanel></div> : null}

        {stage === "student" && currentScreen?.type === "interaction" ? <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border-2 border-[#152668]/20 bg-[#f7efe6] shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#152668]/15 bg-white px-4 py-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-sky-700">{destination === "homework" ? "My homework" : "Class 4A wall"} · {homeworkTitle}</p><p className="mt-0.5 text-sm font-bold text-kid-ink">The same activity player students use</p></div>{assignHomework && postToWall ? <div className="flex rounded-lg bg-stone-100 p-1 text-xs"><button type="button" onClick={() => setDestination("homework")} className={`rounded px-2 py-1 ${destination === "homework" ? "bg-white shadow" : ""}`}>Homework</button><button type="button" onClick={() => setDestination("wall")} className={`rounded px-2 py-1 ${destination === "wall" ? "bg-white shadow" : ""}`}>Wall</button></div> : <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">Published</span>}</div><div className="relative min-h-[34rem] overflow-hidden p-3 sm:p-5">
          {currentScreen.subtype === "mc_quiz" ? <McQuizView parsed={currentScreen} muted={false} passed={screenPassed} onPass={passCurrentScreen} onWrong={markCurrentWrong} onNext={advancePlayer} onBack={backPlayer} showBack={itemIndex > 0} controlsPlacement="stage-footer" snappyCorrect /> : null}
          {currentScreen.subtype === "letter_mixup" ? <LetterMixupView parsed={currentScreen} muted={false} passed={screenPassed} onPass={passCurrentScreen} onWrong={markCurrentWrong} onNext={advancePlayer} onBack={backPlayer} showBack={itemIndex > 0} controlsPlacement="stage-footer" /> : null}
          {currentScreen.subtype === "flashcards" ? <FlashcardsView parsed={currentScreen} muted={false} passed={screenPassed} onPass={passCurrentScreen} onWrong={markCurrentWrong} onNext={advancePlayer} onBack={backPlayer} showBack={false} controlsPlacement="stage-footer" /> : null}
        </div></div> : null}

        {stage === "report" ? destination === "homework" ? <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><TeacherPanel><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Homework report · real demo answers</p><h4 className="mt-1 text-lg font-semibold text-stone-900">{homeworkTitle}</h4><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-stone-50 p-3"><p className="text-2xl font-bold">{answeredCount}</p><p className="text-xs text-stone-500">Answered</p></div><div className="rounded-lg bg-stone-50 p-3"><p className="text-2xl font-bold">{correctCount}</p><p className="text-xs text-stone-500">Successful</p></div><div className="rounded-lg bg-stone-50 p-3"><p className="text-2xl font-bold">{Math.round(score * 100)}%</p><p className="text-xs text-stone-500">Mastery</p></div></div><button type="button" onClick={() => { setItemIndex(0); setStage("student"); }} className="mt-5 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium">Try again</button></TeacherPanel><TeacherPanel><div className="flex items-center justify-between"><p className="font-semibold text-stone-900">Item evidence</p><span className="text-xs text-stone-500">From your clicks</span></div><div className="mt-4 space-y-3">{activityItems.map((item, index) => <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-stone-200 p-3"><div><p className="text-sm font-medium">Item {index + 1} · {words[index]}</p><p className="text-xs text-stone-500">{answers[item.id] === true ? "Successful on this attempt" : answers[item.id] === false ? "Needs another try" : "Not completed"}</p></div><MasteryScoreBar score={answers[item.id] === true ? 1 : answers[item.id] === false ? .35 : 0} /></div>)}</div><div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><strong>Suggested next step:</strong> {score >= .8 ? "Ready to use these words in a speaking task." : "Review missed words, then assign a quick retry."}</div></TeacherPanel></div> : <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><TeacherPanel><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Classroom wall analytics · generated preview</p><h4 className="mt-1 text-lg font-semibold text-stone-900">{homeworkTitle}</h4><p className="mt-2 text-sm text-stone-600">A simple engagement view for a public class activity—not individual mastery evidence.</p><button type="button" onClick={() => { setItemIndex(0); setStage("student"); }} className="mt-5 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium">Play from wall again</button></TeacherPanel><TeacherPanel><div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-sky-50 p-4"><p className="text-3xl font-bold text-sky-950">{wallPlays}</p><p className="mt-1 text-xs text-sky-700">Times played</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-3xl font-bold text-emerald-950">{wallHighest}%</p><p className="mt-1 text-xs text-emerald-700">Highest score</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-3xl font-bold text-amber-950">{wallAverage}%</p><p className="mt-1 text-xs text-amber-700">Average score</p></div></div><div className="mt-5 rounded-xl border border-stone-200 p-4"><div className="flex items-center justify-between text-sm"><span className="font-medium">Class engagement</span><span className="font-bold text-emerald-700">Strong</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full w-[82%] rounded-full bg-emerald-500" /></div><p className="mt-3 text-xs text-stone-500">Generated sample analytics include the play-through you just completed.</p></div></TeacherPanel></div> : null}
      </div></div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white px-4 py-3 sm:px-6"><p className="text-xs text-stone-500">Uses the product’s vocabulary compiler, activity documents, media fields, and student UI primitives.</p><button type="button" onClick={resetDemo} className="text-xs font-medium text-sky-800 underline underline-offset-4">Reset demo</button></div>
    </div>
  );
}
