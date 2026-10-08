import type { HomeworkCollectionMiniPlayPart } from "@/lib/homework-collections/types";
import { readMiniPlayResponse } from "@/lib/homework-collections/mini-play";

/** Shared student preview and teacher review of the exact saved response. */
export function MiniPlayViewer({ part, answers }: { part: HomeworkCollectionMiniPlayPart; answers: Record<string, string> }) {
  const play = readMiniPlayResponse(answers);
  return (
    <article className="space-y-5 rounded-2xl border border-violet-200 bg-white p-4 sm:p-6" aria-label="Play preview">
      <header><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Mini play</p><h3 className="mt-1 break-words text-2xl font-extrabold text-stone-950">{play.title || "My untitled play"}</h3></header>
      <section aria-label="Characters"><h4 className="font-extrabold text-stone-900">Characters</h4><dl className="mt-2 space-y-2">{play.characters.map((character, index) => <div key={`${character.id}-${index}`}><dt className="break-words font-bold text-violet-900">{character.name || "Unnamed character"}</dt><dd className="whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">{character.description || "No description yet."}</dd></div>)}</dl></section>
      <section aria-label="Setting"><h4 className="font-extrabold text-stone-900">Setting</h4><p className="mt-2 break-words font-semibold text-stone-800">{play.setting.place || "Place not written yet"}{play.setting.time ? ` · ${play.setting.time}` : ""}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">{play.setting.description || "No setting description yet."}</p></section>
      <section aria-label="Script"><h4 className="font-extrabold text-stone-900">Script</h4><ol className="mt-3 space-y-3">{play.lines.map((line, index) => <li key={`${line.id}-${index}`} className="whitespace-pre-wrap break-words text-sm leading-7 text-stone-800">{line.kind === "direction" ? <em className="text-stone-600">[{line.text || "Stage direction"}]</em> : <><strong className="text-violet-900">{play.characters.find((character) => character.id === line.characterId)?.name || "Choose a speaker"}: </strong>{line.text || "…"}</>}</li>)}</ol>{!play.lines.length ? <p className="mt-2 text-sm text-stone-500">Your script will appear here.</p> : null}</section>
      <p className="text-xs text-stone-500">{part.minDialogueLines} or more spoken lines · Teacher review</p>
    </article>
  );
}
