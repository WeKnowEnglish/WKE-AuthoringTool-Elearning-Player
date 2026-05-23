import type { ExplorePayload } from "@/lib/lesson-schemas";
import {
  getExploreTemplate,
  type ExploreGateScenePreset,
  type ExploreTemplate,
  type ExploreTemplateId,
} from "@/lib/explore/explore-templates";

export type ResolvedExploreGateScene = ExploreGateScenePreset & {
  gateIndex: number;
  /** Merged scene backdrop: gate override > payload background > template default. */
  sceneBackgroundUrl?: string;
};

export type ExplorePresentation = {
  template: ExploreTemplate;
  templateId: ExploreTemplateId;
  /** Run loop backdrop (payload background_url overrides template sky when set). */
  runBackgroundUrl?: string;
  gateScenes: ResolvedExploreGateScene[];
  encounterBackgroundUrl?: string;
};

export function resolveExplorePresentation(payload: ExplorePayload): ExplorePresentation {
  const templateId = (payload.explore_template ?? "default_run_v1") as ExploreTemplateId;
  const template = getExploreTemplate(templateId);
  const runBackgroundUrl = payload.background_url?.trim() || undefined;

  const gateScenes: ResolvedExploreGateScene[] = payload.gates.map((gate, gateIndex) => {
    const preset = template.gateScenes[gateIndex] ?? template.gateScenes[0]!;
    return {
      ...preset,
      gateIndex,
      obstacleKind: preset.obstacleKind,
      sceneBackgroundUrl:
        gate.scene_image_url?.trim() ||
        gate.image_url?.trim() ||
        runBackgroundUrl,
    };
  });

  return {
    template,
    templateId: template.id,
    runBackgroundUrl,
    gateScenes,
    encounterBackgroundUrl:
      payload.encounter.image_url?.trim() || runBackgroundUrl,
  };
}
