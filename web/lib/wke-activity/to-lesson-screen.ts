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
import {
  resolveOnTapActions,
  syncResponseCardsFromOnTap,
} from "@/lib/wke-activity/on-tap-actions";
import type { WkeObjectAction, WkeResponseCard } from "@/lib/wke-activity/types";

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

function mapResponseCards(cards: WkeResponseCard[] | undefined) {
  if (!cards?.length) return undefined;
  return cards.map((card) => {
    switch (card.kind) {
      case "info":
        return {
          id: card.id,
          kind: "info" as const,
          text: card.text,
          ...(card.imageUrl ? { image_url: card.imageUrl } : {}),
        };
      case "audio":
        return {
          id: card.id,
          kind: "audio" as const,
          audio_url: card.audioUrl,
          ...(card.label ? { label: card.label } : {}),
        };
      case "dialogue":
        return {
          id: card.id,
          kind: "dialogue" as const,
          ...(card.dialogueId ? { dialogue_id: card.dialogueId } : {}),
        };
      case "question":
        return {
          id: card.id,
          kind: "question" as const,
          prompt: card.prompt,
          question_type: card.questionType,
          choices: card.choices,
          correct_choice_id: card.correctChoiceId,
          ...(card.gateDiscover != null ? { gate_discover: card.gateDiscover } : {}),
        };
      default: {
        const _exhaustive: never = card;
        return _exhaustive;
      }
    }
  });
}

function mapOnTapActions(
  actions: WkeObjectAction[],
  assets: WkeActivityV2Parsed["assets"],
) {
  if (!actions.length) return undefined;
  return actions.map((action) => {
    switch (action.type) {
      case "play_audio":
        return {
          id: action.id,
          type: "play_audio" as const,
          audio_url: action.audioUrl,
          ...(action.label ? { label: action.label } : {}),
          ...(action.wait != null ? { wait: action.wait } : {}),
        };
      case "show_dialogue":
        return {
          id: action.id,
          type: "show_dialogue" as const,
          ...(action.dialogueId ? { dialogue_id: action.dialogueId } : {}),
          ...(action.wait != null ? { wait: action.wait } : {}),
        };
      case "show_info":
        return {
          id: action.id,
          type: "show_info" as const,
          text: action.text,
          ...(action.imageUrl ? { image_url: action.imageUrl } : {}),
          ...(action.wait != null ? { wait: action.wait } : {}),
        };
      case "ask_question":
        return {
          id: action.id,
          type: "ask_question" as const,
          prompt: action.prompt,
          question_type: action.questionType,
          choices: action.choices,
          correct_choice_id: action.correctChoiceId,
          ...(action.gateDiscover != null ? { gate_discover: action.gateDiscover } : {}),
          ...(action.wait != null ? { wait: action.wait } : {}),
        };
      case "wait":
        return { id: action.id, type: "wait" as const, ms: action.ms };
      case "set_object_state":
        return {
          id: action.id,
          type: "set_object_state" as const,
          target_id: action.targetId,
          state: action.state,
        };
      case "swap_sprite_asset": {
        const src = assets.find((a) => a.id === action.spriteAssetId)?.src;
        return {
          id: action.id,
          type: "swap_sprite_asset" as const,
          target_id: action.targetId,
          sprite_asset_id: action.spriteAssetId,
          ...(src ? { sprite_url: src } : {}),
        };
      }
      case "tween_object":
        return {
          id: action.id,
          type: "tween_object" as const,
          target_id: action.targetId,
          to: action.to,
          duration_ms: action.durationMs,
          ...(action.easing ? { easing: action.easing } : {}),
          ...(action.wait != null ? { wait: action.wait } : {}),
        };
      case "enter_object":
        return {
          id: action.id,
          type: "enter_object" as const,
          target_id: action.targetId,
          to: action.to,
          duration_ms: action.durationMs,
          ...(action.from ? { from: action.from } : {}),
          ...(action.wait != null ? { wait: action.wait } : {}),
        };
      case "complete_object":
        return {
          id: action.id,
          type: "complete_object" as const,
          ...(action.targetId ? { target_id: action.targetId } : {}),
        };
      case "pulse_object":
        return {
          id: action.id,
          type: "pulse_object" as const,
          target_id: action.targetId,
          ...(action.enabled != null ? { enabled: action.enabled } : {}),
        };
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  });
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

  const phases =
    activity.interaction.phases?.map((phase) => {
      const phaseAsset = activity.assets.find((a) => a.id === phase.imageAssetId);
      if (!phaseAsset) {
        throw new Error(`Missing phase asset ${phase.imageAssetId}`);
      }
      return {
        id: phase.id,
        title: phase.title,
        image_url: phaseAsset.src,
        image_alt: phaseAsset.alt,
        image_width: phaseAsset.intrinsicSize?.width,
        image_height: phaseAsset.intrinsicSize?.height,
        hotspot_ids: phase.hotspotIds,
        ...(phase.onEnter?.length
          ? { on_enter: mapOnTapActions(phase.onEnter, activity.assets) }
          : {}),
        ...(phase.objective ? { objective: { label: phase.objective.label } } : {}),
        ...(phase.strictOrder != null ? { strict_order: phase.strictOrder } : {}),
        ...(phase.hintPulseEnabled != null
          ? { hint_pulse_enabled: phase.hintPulseEnabled }
          : {}),
        ...(phase.visitedWhen === "dialogue-completed" ||
        phase.visitedWhen === "dialogue-finished"
          ? { visited_when: "dialogue_finished" as const }
          : phase.visitedWhen === "dialogue-started"
            ? { visited_when: "dialogue_started" as const }
            : {}),
        ...(phase.autoPlayOnSelect != null
          ? { auto_play_on_select: phase.autoPlayOnSelect }
          : {}),
      };
    }) ?? undefined;

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
        interaction_kind: h.interactionKind,
        presentation: h.presentation,
        ...(h.presentation === "sprite" && h.spriteAssetId
          ? {
              sprite_url: activity.assets.find((asset) => asset.id === h.spriteAssetId)
                ?.src,
            }
          : {}),
        ...(h.labelText != null ? { label_text: h.labelText } : {}),
        ...(h.textStyle && (h.textStyle.role || h.textStyle.align)
          ? {
              text_style: {
                ...(h.textStyle.role ? { role: h.textStyle.role } : {}),
                ...(h.textStyle.align ? { align: h.textStyle.align } : {}),
              },
            }
          : {}),
        ...(h.rotationDeg != null && h.rotationDeg !== 0
          ? { rotation_deg: h.rotationDeg }
          : {}),
        ...(h.zIndex != null ? { z_index: h.zIndex } : {}),
        ...(h.animation &&
        ((h.animation.entrance && h.animation.entrance !== "none") ||
          (h.animation.idle && h.animation.idle !== "none") ||
          h.animation.entranceDurationMs != null ||
          h.animation.entranceDelayMs != null)
          ? {
              animation: {
                ...(h.animation.entrance && h.animation.entrance !== "none"
                  ? { entrance: h.animation.entrance }
                  : {}),
                ...(h.animation.entranceDurationMs != null
                  ? { entrance_duration_ms: h.animation.entranceDurationMs }
                  : {}),
                ...(h.animation.entranceDelayMs != null
                  ? { entrance_delay_ms: h.animation.entranceDelayMs }
                  : {}),
                ...(h.animation.idle && h.animation.idle !== "none"
                  ? { idle: h.animation.idle }
                  : {}),
              },
            }
          : {}),
        order_index: h.orderIndex,
        initial_state: h.initialState,
        wrong_order_hint: h.wrongOrderHint,
        response_cards: mapResponseCards(
          syncResponseCardsFromOnTap(resolveOnTapActions(h)) ?? h.responseCards,
        ),
        on_tap: mapOnTapActions(resolveOnTapActions(h), activity.assets),
        enable_hint_pulse: h.enableHintPulse,
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
        speaker: t.speaker ?? "",
        text: t.text,
        ...(t.speakText?.trim() ? { speak_text: t.speakText.trim() } : {}),
        ...(t.audioUrl?.trim() ? { audio_url: t.audioUrl.trim() } : {}),
      })),
    })),
    ...(phases?.length ? { phases } : {}),
    ...(activity.interaction.objective
      ? { objective: { label: activity.interaction.objective.label } }
      : {}),
    ...(activity.interaction.strictOrder != null
      ? { strict_order: activity.interaction.strictOrder }
      : {}),
    ...(activity.interaction.hintPulseEnabled != null
      ? { hint_pulse_enabled: activity.interaction.hintPulseEnabled }
      : {}),
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
