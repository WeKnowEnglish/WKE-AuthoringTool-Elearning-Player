"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { PuppetAnimationSelect } from "@/components/puppet-activity/PuppetAnimationSelect";
import { PuppetCaptionLayoutControls } from "@/components/puppet-activity/PuppetCaptionLayoutControls";
import { PuppetStageLayoutControls } from "@/components/puppet-activity/PuppetStageLayoutControls";
import { PuppetMotionToggle } from "@/components/puppet-activity/PuppetMotionToggle";
import { PuppetPivotToggle } from "@/components/puppet-activity/PuppetPivotToggle";
import { PuppetPresenter } from "@/components/puppet-activity/PuppetPresenter";
import { PuppetRigEditorPanel } from "@/components/puppet-activity/PuppetRigEditorPanel";
import { PuppetSkeletonGraphModal } from "@/components/puppet-activity/PuppetSkeletonGraphModal";
import { PuppetSkeletonToggle } from "@/components/puppet-activity/PuppetSkeletonToggle";
import { resolveSkeletonRoot } from "@/components/puppet-activity/PuppetStage";
import { playSfx } from "@/lib/audio/sfx";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";
import {
  clampMotionTune,
  type PartMotionTune,
} from "@/lib/puppet-activity/part-motion-tune";
import {
  AJ_PRESENTER_V1,
  PUPPET_RIG_PRESETS,
  rigPresetToEditorState,
} from "@/lib/puppet-activity/presets";
import { pivotMapToRigPivots, type PivotPercent } from "@/lib/puppet-activity/pivot-utils";
import { getDefaultHostPartSrcList } from "@/lib/puppet-activity/puppets/default-host";
import { getPuppet, getPuppetScript } from "@/lib/puppet-activity/registry";
import type { SkeletonParentMap } from "@/lib/puppet-activity/puppet-skeleton-utils";
import type { PuppetAnimationId, PuppetPartKey, PuppetScriptId } from "@/lib/puppet-activity/types";
import type { PuppetCaptionLayout } from "@/lib/puppet-activity/caption-layout";
import {
  clampStageLayout,
  DEFAULT_PUPPET_STAGE_LAYOUT,
  type PuppetStageLayout,
} from "@/lib/puppet-activity/stage-layout";
import { assertValidPuppetScript } from "@/lib/puppet-activity/validate";

function initialMotionEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const FROZEN_RIG_BASELINE = rigPresetToEditorState(AJ_PRESENTER_V1);

export function PuppetPresenterOverlay({
  scriptId,
  muted,
  onClose,
}: {
  scriptId: PuppetScriptId;
  muted: boolean;
  onClose: () => void;
}) {
  const script = getPuppetScript(scriptId);
  assertValidPuppetScript(script);
  const puppet = getPuppet(script.puppetId);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [rigEditorOpen, setRigEditorOpen] = useState(false);
  const [skeletonEditorOpen, setSkeletonEditorOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PuppetPartKey>("upperArm");
  const [pivotPercents, setPivotPercents] = useState<Record<PuppetPartKey, PivotPercent>>(
    () => ({ ...FROZEN_RIG_BASELINE.pivotPercents }),
  );
  const [partMotion, setPartMotion] = useState<Record<PuppetPartKey, PartMotionTune>>(() => ({
    ...FROZEN_RIG_BASELINE.partMotion,
  }));
  const [skeletonParents, setSkeletonParents] = useState<SkeletonParentMap>(() => ({
    ...FROZEN_RIG_BASELINE.skeletonParents,
  }));
  const [previewGesture, setPreviewGesture] = useState<PuppetAnimationId>("idle");
  const [previewGestureGeneration, setPreviewGestureGeneration] = useState(0);
  const [stageLayout, setStageLayout] = useState<PuppetStageLayout>(() => ({
    ...DEFAULT_PUPPET_STAGE_LAYOUT,
  }));
  const [captionLayoutOverrides, setCaptionLayoutOverrides] = useState<
    Partial<Record<number, PuppetCaptionLayout>>
  >({});
  const [editingCaptionBeatIndex, setEditingCaptionBeatIndex] = useState(0);

  const lineBeatOptions = useMemo(() => {
    return script.beats
      .map((beat, beatIndex) => {
        if (beat.kind !== "line") return null;
        const preview = beat.text.trim().slice(0, 36);
        return {
          beatIndex,
          label: `Beat ${beatIndex}: ${preview}${beat.text.length > 36 ? "…" : ""}`,
          beat,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [script.beats]);

  const baselinePivots = useMemo(
    () => ({ ...FROZEN_RIG_BASELINE.pivotPercents }),
    [],
  );
  const baselineMotion = useMemo(
    () => ({ ...FROZEN_RIG_BASELINE.partMotion }),
    [],
  );
  const baselineSkeleton = useMemo(
    () => ({ ...FROZEN_RIG_BASELINE.skeletonParents }),
    [],
  );

  const pivotOverrides = useMemo(
    () => pivotMapToRigPivots(pivotPercents),
    [pivotPercents],
  );

  const skeletonRoot = useMemo(
    () => resolveSkeletonRoot(skeletonParents),
    [skeletonParents],
  );

  useLayoutEffect(() => {
    setMotionEnabled(initialMotionEnabled());
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    void prefetchImageUrls(getDefaultHostPartSrcList());
  }, [puppet.id]);

  const handleRigToggle = useCallback(() => {
    setRigEditorOpen((open) => {
      const next = !open;
      if (next) setMotionEnabled(true);
      return next;
    });
  }, []);

  const handleSkeletonToggle = useCallback(() => {
    setSkeletonEditorOpen((open) => {
      const next = !open;
      if (next) setMotionEnabled(true);
      return next;
    });
  }, []);

  const handlePreviewGestureChange = useCallback((id: PuppetAnimationId) => {
    setPreviewGesture(id);
    if (id !== "idle" && id !== "none") {
      setPreviewGestureGeneration((n) => n + 1);
      setMotionEnabled(true);
    }
  }, []);

  const handleLoadRigPreset = useCallback((presetId: string) => {
    const preset = PUPPET_RIG_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const state = rigPresetToEditorState(preset);
    setPivotPercents(state.pivotPercents);
    setPartMotion(state.partMotion);
    setSkeletonParents(state.skeletonParents);
    setSelectedPart("body");
  }, []);

  const handlePivotChange = useCallback((part: PuppetPartKey, pivot: PivotPercent) => {
    setPivotPercents((prev) => ({ ...prev, [part]: pivot }));
  }, []);

  const handleMotionChange = useCallback((part: PuppetPartKey, tune: PartMotionTune) => {
    setPartMotion((prev) => ({ ...prev, [part]: clampMotionTune(tune) }));
  }, []);

  const handleResetPart = useCallback(
    (part: PuppetPartKey) => {
      setPivotPercents((prev) => ({ ...prev, [part]: baselinePivots[part] }));
      setPartMotion((prev) => ({ ...prev, [part]: { ...baselineMotion[part] } }));
    },
    [baselinePivots, baselineMotion],
  );

  const handleResetStageLayout = useCallback(() => {
    setStageLayout({ ...DEFAULT_PUPPET_STAGE_LAYOUT });
  }, []);

  const handleResetAll = useCallback(() => {
    setPivotPercents(baselinePivots);
    setPartMotion(baselineMotion);
    setSkeletonParents(baselineSkeleton);
    handleResetStageLayout();
  }, [baselinePivots, baselineMotion, baselineSkeleton, handleResetStageLayout]);

  const handleResetSkeleton = useCallback(() => {
    setSkeletonParents(baselineSkeleton);
    setSelectedPart("body");
  }, [baselineSkeleton]);

  const handleCaptionOverrideChange = useCallback(
    (beatIndex: number, layout: PuppetCaptionLayout) => {
      setCaptionLayoutOverrides((prev) => ({ ...prev, [beatIndex]: layout }));
    },
    [],
  );

  const handleClearCaptionOverride = useCallback((beatIndex: number) => {
    setCaptionLayoutOverrides((prev) => {
      const next = { ...prev };
      delete next[beatIndex];
      return next;
    });
  }, []);

  const handleActiveLineBeatIndexChange = useCallback((beatIndex: number | null) => {
    if (beatIndex != null) {
      setEditingCaptionBeatIndex(beatIndex);
    }
  }, []);

  useEffect(() => {
    const first = lineBeatOptions[0]?.beatIndex;
    if (first != null && !lineBeatOptions.some((lb) => lb.beatIndex === editingCaptionBeatIndex)) {
      setEditingCaptionBeatIndex(first);
    }
  }, [lineBeatOptions, editingCaptionBeatIndex]);

  return (
    <div
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-[#f7bf4d] text-kid-ink"
      role="dialog"
      aria-modal="true"
      aria-label={`${script.title} grammar puppet`}
    >
      <div className="flex shrink-0 flex-col border-b-4 border-kid-ink bg-[#d8871f]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-sm font-extrabold uppercase tracking-wide text-kid-ink">
            {script.title}
          </p>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <PuppetAnimationSelect
              value={previewGesture}
              onChange={handlePreviewGestureChange}
              muted={muted}
              compact
            />
            <PuppetPivotToggle
              active={rigEditorOpen}
              muted={muted}
              onToggle={handleRigToggle}
            />
            <PuppetSkeletonToggle
              active={skeletonEditorOpen}
              muted={muted}
              onToggle={handleSkeletonToggle}
            />
            <PuppetMotionToggle
              enabled={motionEnabled}
              muted={muted}
              onToggle={() => setMotionEnabled((on) => !on)}
            />
            <KidButton
              type="button"
              variant="secondary"
              className="!min-h-9 shrink-0 text-sm"
              onClick={() => {
                playSfx("tap", muted);
                onClose();
              }}
            >
              Close
            </KidButton>
          </div>
        </div>
        <PuppetStageLayoutControls
          layout={stageLayout}
          onChange={(next) => setStageLayout(clampStageLayout(next))}
          onReset={handleResetStageLayout}
          muted={muted}
        />
        <PuppetCaptionLayoutControls
          script={script}
          lineBeats={lineBeatOptions}
          editingBeatIndex={editingCaptionBeatIndex}
          onEditingBeatIndexChange={setEditingCaptionBeatIndex}
          overrides={captionLayoutOverrides}
          onOverrideChange={handleCaptionOverrideChange}
          onClearOverride={handleClearCaptionOverride}
          muted={muted}
        />
        {rigEditorOpen ?
          <PuppetRigEditorPanel
            pivots={pivotPercents}
            partMotion={partMotion}
            selectedPart={selectedPart}
            onSelectPart={setSelectedPart}
            onPivotChange={handlePivotChange}
            onMotionChange={handleMotionChange}
            onResetPart={handleResetPart}
            onResetAll={handleResetAll}
            onLoadRigPreset={handleLoadRigPreset}
            muted={muted}
          />
        : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PuppetPresenter
          script={script}
          muted={muted}
          motionEnabled={motionEnabled}
          pivotOverrides={pivotOverrides}
          partMotionTunes={partMotion}
          rigEditorOpen={rigEditorOpen}
          rigToolsPart={rigEditorOpen ? selectedPart : null}
          skeletonRoot={skeletonRoot}
          previewGesture={previewGesture}
          previewGestureGeneration={previewGestureGeneration}
          stageLayout={stageLayout}
          captionLayoutOverrides={captionLayoutOverrides}
          onActiveLineBeatIndexChange={handleActiveLineBeatIndexChange}
          onClose={onClose}
        />
      </div>

      <PuppetSkeletonGraphModal
        open={skeletonEditorOpen}
        puppet={puppet}
        pivots={pivotPercents}
        parentMap={skeletonParents}
        onParentMapChange={setSkeletonParents}
        onReset={handleResetSkeleton}
        onClose={() => {
          playSfx("tap", muted);
          setSkeletonEditorOpen(false);
        }}
        muted={muted}
      />
    </div>
  );
}
