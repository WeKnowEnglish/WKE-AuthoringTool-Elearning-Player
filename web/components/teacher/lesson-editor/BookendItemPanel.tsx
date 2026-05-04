"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { AudioUrlControls } from "@/components/teacher/media/AudioUrlControls";
import type {
  StartPlaygroundTapReward,
  StoryItem,
  StoryPage,
} from "@/lib/lesson-schemas";

function labelClass() {
  return "mt-2 block text-sm font-medium text-neutral-800";
}

function newTapSpeechId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ts-${Math.random().toString(36).slice(2, 11)}`;
}

function getTapSoundUrl(item: StoryItem): string {
  const sp = item.tap_speeches?.find((s) => s.sound_url?.trim());
  return sp?.sound_url?.trim() ?? item.on_click?.sound_url?.trim() ?? "";
}

function patchItemTapSound(item: StoryItem, soundUrl: string): StoryItem {
  const trimmed = soundUrl.trim();
  if (!trimmed) {
    const { tap_speeches: _ts, on_click: oc, ...rest } = item;
    const nextClick =
      oc?.triggers?.length || oc?.run_emphasis ?
        {
          ...oc,
          sound_url: undefined,
        }
      : undefined;
    return { ...rest, tap_speeches: undefined, on_click: nextClick };
  }
  return {
    ...item,
    tap_speeches: [
      {
        id: item.tap_speeches?.[0]?.id ?? newTapSpeechId(),
        priority: 0,
        sound_url: trimmed,
      },
    ],
    on_click:
      item.on_click?.triggers?.length || item.on_click?.run_emphasis ?
        { ...item.on_click, sound_url: undefined }
      : undefined,
  };
}

function patchItemEmphasisOnTap(item: StoryItem, on: boolean): StoryItem {
  return {
    ...item,
    on_click: on ? { ...item.on_click, run_emphasis: true } : { ...item.on_click, run_emphasis: undefined },
  };
}

function rewardHasEffect(tr: StartPlaygroundTapReward): boolean {
  return (
    (tr.gold != null && tr.gold > 0) ||
    (tr.experience != null && tr.experience > 0) ||
    tr.sticker === true ||
    !!(tr.play_sound_url?.trim())
  );
}

type Props = {
  item: StoryItem;
  page: StoryPage;
  tapReward: StartPlaygroundTapReward | undefined;
  busy: boolean;
  onPatchItem: (patcher: (it: StoryItem) => StoryItem) => void;
  onSetTapReward: (next: StartPlaygroundTapReward | undefined) => void;
  onRemoveItem: () => void;
};

export function BookendItemPanel({
  item,
  page: _page,
  tapReward,
  busy,
  onPatchItem,
  onSetTapReward,
  onRemoveItem,
}: Props) {
  void _page;
  const k = item.kind ?? "image";
  const tapSound = getTapSoundUrl(item);
  const emphasisOnTap = item.on_click?.run_emphasis === true;

  const prizeEnabled = tapReward != null && rewardHasEffect(tapReward);

  return (
    <div className="space-y-3 rounded border border-sky-200 bg-sky-50/50 p-3">
      <p className="text-sm font-bold text-sky-950">Selected object</p>
      <p className="text-xs text-neutral-600">
        Students tap <strong>this picture or button</strong> on the stage — simple self-taps only
        here.
      </p>

      <label className={labelClass()}>
        Name (for you)
        <input
          type="text"
          className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          value={item.name ?? ""}
          disabled={busy}
          onChange={(e) => {
            const v = e.target.value.trim();
            onPatchItem((it) => ({ ...it, name: v || undefined }));
          }}
        />
      </label>

      {k === "image" ? (
        <MediaUrlControls
          label="Picture URL"
          value={item.image_url ?? ""}
          onChange={(v) => onPatchItem((it) => ({ ...it, image_url: v || undefined }))}
          disabled={busy}
        />
      ) : null}

      {k === "text" ? (
        <>
          <label className={labelClass()}>
            Text
            <textarea
              className="mt-1 min-h-[4rem] w-full resize-y rounded border border-neutral-300 px-2 py-1 text-sm"
              value={item.text ?? ""}
              disabled={busy}
              onChange={(e) => onPatchItem((it) => ({ ...it, text: e.target.value }))}
            />
          </label>
          <label className={labelClass()}>
            Text size (px)
            <input
              type="number"
              min={10}
              max={96}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              value={item.text_size_px ?? 24}
              disabled={busy}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                onPatchItem((it) => ({
                  ...it,
                  text_size_px: Number.isFinite(n) ? Math.min(96, Math.max(10, n)) : 24,
                }));
              }}
            />
          </label>
        </>
      ) : null}

      {k === "button" ? (
        <label className={labelClass()}>
          Button label
          <input
            type="text"
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            value={item.text ?? ""}
            disabled={busy}
            onChange={(e) => onPatchItem((it) => ({ ...it, text: e.target.value }))}
          />
        </label>
      ) : null}

      <div className="rounded border border-white/80 bg-white/90 p-2">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          When a student taps this
        </p>
        <div className="mt-2">
          <AudioUrlControls
            label="Tap sound (optional)"
            value={tapSound}
            onChange={(v) => onPatchItem((it) => patchItemTapSound(it, v))}
            disabled={busy}
            compact
          />
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={emphasisOnTap}
            disabled={busy}
            onChange={(e) => onPatchItem((it) => patchItemEmphasisOnTap(it, e.target.checked))}
          />
          Wiggle / pop on tap
        </label>
      </div>

      <div className="rounded border border-amber-200 bg-amber-50/80 p-2">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-950">
          Little prize (optional)
        </p>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-amber-950">
          <input
            type="checkbox"
            checked={prizeEnabled}
            disabled={busy}
            onChange={(e) => {
              if (!e.target.checked) {
                onSetTapReward(undefined);
                return;
              }
              onSetTapReward({
                item_id: item.id,
                gold: 1,
                max_triggers: 1,
              });
            }}
          />
          Give gold, XP, or sticker progress when tapped
        </label>
        {prizeEnabled && tapReward ? (
          <div className="mt-3 space-y-2 border-t border-amber-200/80 pt-2">
            <label className={labelClass()}>
              Gold (0–100)
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                value={tapReward.gold ?? 0}
                disabled={busy}
                onChange={(ev) => {
                  const n = Math.min(100, Math.max(0, Math.round(Number(ev.target.value) || 0)));
                  const next = { ...tapReward, gold: n > 0 ? n : undefined };
                  onSetTapReward(rewardHasEffect(next) ? next : undefined);
                }}
              />
            </label>
            <label className={labelClass()}>
              XP (0–500)
              <input
                type="number"
                min={0}
                max={500}
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                value={tapReward.experience ?? 0}
                disabled={busy}
                onChange={(ev) => {
                  const n = Math.min(500, Math.max(0, Math.round(Number(ev.target.value) || 0)));
                  const next = { ...tapReward, experience: n > 0 ? n : undefined };
                  onSetTapReward(rewardHasEffect(next) ? next : undefined);
                }}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
              <input
                type="checkbox"
                checked={tapReward.sticker === true}
                disabled={busy}
                onChange={(ev) => {
                  const next = { ...tapReward, sticker: ev.target.checked ? true : undefined };
                  onSetTapReward(rewardHasEffect(next) ? next : undefined);
                }}
              />
              Count toward sticker book
            </label>
            <label className={labelClass()}>
              Max times per visit
              <input
                type="number"
                min={1}
                max={20}
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                value={tapReward.max_triggers ?? 1}
                disabled={busy}
                onChange={(ev) => {
                  const n = Math.min(20, Math.max(1, Math.round(Number(ev.target.value) || 1)));
                  onSetTapReward({ ...tapReward, max_triggers: n });
                }}
              />
            </label>
            <AudioUrlControls
              label="Extra prize sound (optional)"
              value={tapReward.play_sound_url ?? ""}
              onChange={(v) => {
                const next = { ...tapReward, play_sound_url: v.trim() || undefined };
                onSetTapReward(rewardHasEffect(next) ? next : undefined);
              }}
              disabled={busy}
              compact
            />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="w-full rounded border border-red-300 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50"
        disabled={busy}
        onClick={onRemoveItem}
      >
        Remove object from stage
      </button>
    </div>
  );
}
