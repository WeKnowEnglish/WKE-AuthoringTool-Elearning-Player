import type { LessonScreenRow } from "@/lib/lesson/types";
import {
  exploreHotspotsPayloadSchema,
  type ExploreHotspotsPayload,
} from "@/lib/lesson-schemas";
import { geometryToHitPoints } from "@/lib/wke-activity/geometry";
import {
  parseWkeActivity,
  type WkeActivityV2Parsed,
} from "@/lib/wke-activity/schema";

function isHotspot(
  el: WkeActivityV2Parsed["layout"]["elements"][number],
): el is Extract<WkeActivityV2Parsed["layout"]["elements"][number], { kind: "hotspot" }> {
  return el.kind === "hotspot";
}

function isMedia(
  el: WkeActivityV2Parsed["layout"]["elements"][number],
): el is Extract<WkeActivityV2Parsed["layout"]["elements"][number], { kind: "media" }> {
  return el.kind === "media";
}

function isDialoguePanel(
  el: WkeActivityV2Parsed["layout"]["elements"][number],
): el is Extract<
  WkeActivityV2Parsed["layout"]["elements"][number],
  { kind: "dialogue-panel" }
> {
  return el.kind === "dialogue-panel";
}

/** Map a Studio `.wkeactivity` document to a Lesson Player `explore_hotspots` payload. */
export function wkeActivityToExploreHotspotsPayload(
  raw: unknown,
): ExploreHotspotsPayload {
  const activity = parseWkeActivity(raw);
  const media = activity.layout.elements.find(isMedia);
  if (!media) {
    throw new Error("Missing media element");
  }
  const asset = activity.assets.find((a) => a.id === media.assetId);
  if (!asset) {
    throw new Error(`Missing asset ${media.assetId}`);
  }

  const mediaRegion = activity.layout.regions.find((r) => r.id === media.regionId);
  const dialoguePanel = activity.layout.elements.find(isDialoguePanel);
  const hotspots = activity.layout.elements.filter(isHotspot);

  const payload = {
    type: "interaction" as const,
    subtype: "explore_hotspots" as const,
    activity_name: activity.name,
    image_url: asset.src,
    image_alt: asset.alt,
    image_fit: media.fit ?? "contain",
    image_width: asset.intrinsicSize?.width,
    image_height: asset.intrinsicSize?.height,
    aspect_ratio: activity.layout.aspectRatio ?? "16:9",
    body_text: activity.content.instruction,
    completion_message: activity.content.completionMessage,
    media_width_fraction: mediaRegion?.widthFraction ?? 0.72,
    hotspots: hotspots.map((h) => {
      const points = geometryToHitPoints(h.geometry);
      if (points.length < 3) {
        throw new Error(
          `Hotspot ${h.id} geometry could not be converted to hit points.`,
        );
      }
      return {
        id: h.id,
        name: h.name,
        accessible_label: h.accessibleLabel,
        required: h.required ?? true,
        tab_order: h.tabOrder,
        points,
        visual_shape: h.visualShape
          ? {
              type: "segmentation-contour" as const,
              source_asset_id: h.visualShape.sourceAssetId,
              source_width: h.visualShape.sourceWidth,
              source_height: h.visualShape.sourceHeight,
              paths: h.visualShape.paths,
              score: h.visualShape.score,
            }
          : undefined,
        highlight: h.highlight
          ? {
              style: h.highlight.style,
              color: h.highlight.color,
              outline_width: h.highlight.outlineWidth,
              glow_radius: h.highlight.glowRadius,
              background_dim: h.highlight.backgroundDim,
            }
          : undefined,
      };
    }),
    dialogue_panel: {
      empty_state_text:
        dialoguePanel?.emptyStateText ?? "Choose a hotspot to listen.",
      show_transcript: dialoguePanel?.showTranscript ?? true,
      show_replay: dialoguePanel?.showReplay ?? true,
      show_progress: dialoguePanel?.showProgress ?? true,
    },
    dialogues: activity.interaction.dialogues.map((d) => ({
      id: d.id,
      hotspot_id: d.hotspotId,
      title: d.title,
      turns: d.turns.map((t) => ({
        speaker: t.speaker,
        text: t.text,
      })),
    })),
    completion: { type: "visit_all_required_hotspots" as const },
    visited_when:
      activity.interaction.visitedWhen === "dialogue-completed" ||
      activity.interaction.visitedWhen === "dialogue-finished"
        ? ("dialogue_finished" as const)
        : ("dialogue_started" as const),
    auto_play_on_select: activity.interaction.autoPlayOnSelect ?? true,
  };

  return exploreHotspotsPayloadSchema.parse(payload);
}

export function wkeActivityToLessonScreen(
  raw: unknown,
  lessonId = "wke-activity",
  orderIndex = 0,
): LessonScreenRow {
  const activity = parseWkeActivity(raw);
  const payload = wkeActivityToExploreHotspotsPayload(raw);
  return {
    id: `screen-${activity.id}`,
    lesson_id: lessonId,
    order_index: orderIndex,
    screen_type: "interaction",
    payload,
  };
}
