import { storyPayloadSchema, type StoryPayload } from "@/lib/lesson-schemas";
import type { LessonScreenRow } from "@/lib/lesson/types";
import type {
  ActivityIntroItemSpec,
  ActivityIntroPageSpec,
  ActivityIntroSpec,
} from "@/lib/activity-intro/types";

function buildItem(item: ActivityIntroItemSpec) {
  const kind = item.kind ?? "image";
  const idle =
    item.idle ?
      [
        {
          id: item.idle.id,
          preset: item.idle.preset,
          ...(item.idle.amplitude != null ? { amplitude: item.idle.amplitude } : {}),
          ...(item.idle.period_ms != null ? { period_ms: item.idle.period_ms } : {}),
        },
      ]
    : undefined;

  const base = {
    id: item.id,
    name: item.name,
    x_percent: item.x,
    y_percent: item.y,
    w_percent: item.w,
    h_percent: item.h,
    show_on_start: true,
    show_card: item.showCard ?? false,
    z_index: item.zIndex ?? 2,
    ...(item.enter
      ? {
          enter: {
            preset: item.enter.preset,
            duration_ms: item.enter.duration_ms ?? 500,
            ...(item.enter.delay_ms != null ? { delay_ms: item.enter.delay_ms } : {}),
          },
        }
      : {}),
    ...(idle ? { idle_animations: idle } : {}),
  };

  if (kind === "text") {
    return {
      ...base,
      kind: "text" as const,
      text: item.text,
      text_color: item.textColor ?? "#0f172a",
      text_size_px: item.textSizePx ?? 28,
    };
  }

  if (kind === "shape") {
    return {
      ...base,
      kind: "shape" as const,
      color_hex: item.colorHex,
    };
  }

  return {
    ...base,
    kind: "image" as const,
    image_url: item.imageUrl,
  };
}

function buildPage(page: ActivityIntroPageSpec) {
  return {
    id: page.id,
    title: page.title,
    ...(page.backgroundImageUrl
      ? { background_image_url: page.backgroundImageUrl }
      : {}),
    ...(page.backgroundColor ? { background_color: page.backgroundColor } : {}),
    image_fit: page.backgroundImageFit ?? "cover",
    body_text: page.bodyText,
    read_aloud_text: page.readAloudText,
    auto_play_page_text: true,
    items: page.items.map(buildItem),
  };
}

/**
 * Build a validated 2-page animated activity intro (`story` payload).
 * Play with LessonPlayer `storyControlsPlacement="stage-overlay"` + `immersiveLayout`.
 */
export function buildActivityIntroStory(spec: ActivityIntroSpec): StoryPayload {
  const [page1, page2] = spec.pages;
  const raw = {
    type: "story" as const,
    payload_version: 2 as const,
    layout_mode: "slide" as const,
    page_turn_style: "slide" as const,
    body_text: page1.bodyText,
    read_aloud_text: page1.readAloudText,
    tts_lang: "en-US",
    pages: [buildPage(page1), buildPage(page2)],
  };
  return storyPayloadSchema.parse(raw);
}

/** Single-screen lesson row for pilots / prepending before an activity. */
export function activityIntroToLessonScreen(
  spec: ActivityIntroSpec,
  lessonId = `activity-intro-${spec.introId}`,
): LessonScreenRow {
  return {
    id: `${lessonId}-story`,
    lesson_id: lessonId,
    order_index: 0,
    screen_type: "story",
    payload: buildActivityIntroStory(spec),
  };
}
