import {
  getNormalizedStoryPages,
  getInteractionSubtype,
  parseScreenPayload,
} from "@/lib/lesson-schemas";

export function screenOutlineLabel(screen: {
  screen_type: string;
  payload: unknown;
}): string {
  const p = parseScreenPayload(screen.screen_type, screen.payload);
  if (!p) {
    const sub = getInteractionSubtype(screen.payload);
    return sub
      ? `interaction · ${sub} (invalid)`
      : `${screen.screen_type} (invalid)`;
  }
  if (p.type === "start") return "Start";
  if (p.type === "story") {
    const pages = getNormalizedStoryPages(p);
    const first = pages[0];
    const raw = first.body_text ?? "";
    const t = raw.trim().slice(0, 48);
    const pg =
      pages.length > 1 ? ` · ${pages.length} pages` : "";
    return t
      ? `Story${pg}: ${t}${raw.length > 48 ? "…" : ""}`
      : `Story${pg}`;
  }
  if (p.type === "interaction") {
    switch (p.subtype) {
      case "mc_quiz":
        return `Quiz: ${p.question.slice(0, 40)}${p.question.length > 40 ? "…" : ""}`;
      case "true_false":
        return `T/F: ${p.statement.slice(0, 40)}${p.statement.length > 40 ? "…" : ""}`;
      case "short_answer": {
        const s = p.prompt.length > 36 ? `${p.prompt.slice(0, 36)}…` : p.prompt;
        return `Short answer: ${s}`;
      }
      case "essay": {
        const s = p.prompt.length > 36 ? `${p.prompt.slice(0, 36)}…` : p.prompt;
        return `Essay: ${s}`;
      }
      case "fill_blanks":
        return "Fill in the blanks";
      case "fix_text":
        return "Fix the text";
      case "hotspot_info":
        return "Hotspots (info)";
      case "hotspot_gate":
        return `Hotspots (${p.mode})`;
      case "drag_match":
        return "Drag match";
      case "drag_sentence":
        return "Drag sentence";
      case "click_targets":
        return "Click target";
      case "sound_sort":
        return "Sound sort";
      case "listen_hotspot_sequence":
        return "Listen hotspot sequence";
      case "listen_color_write":
        return "Listen color/write";
      case "letter_mixup":
        return "Letter mix-up";
      case "word_shape_hunt":
        return "Word shape hunt";
      case "table_complete":
        return "Table complete";
      case "sorting_game":
        return "Sorting game";
      case "voice_question":
        return `Voice question: ${p.prompt.slice(0, 32)}${p.prompt.length > 32 ? "…" : ""}`;
      case "guided_dialogue":
        return `Guided dialogue: ${p.character_name}`;
      case "presentation_interactive":
        return `Interactive presentation${p.slides.length > 1 ? ` · ${p.slides.length} slides` : ""}`;
      default:
        return `Interaction: ${(p as { subtype: string }).subtype}`;
    }
  }
  return screen.screen_type;
}

export function screenThumbnailUrl(screen: {
  screen_type: string;
  payload: unknown;
}): string | null {
  const p = parseScreenPayload(screen.screen_type, screen.payload);
  if (!p) return null;
  if (p.type === "start") return p.image_url ?? null;
  if (p.type === "story") {
    const pages = getNormalizedStoryPages(p);
    const first = pages[0];
    return (
      first.background_image_url ??
      p.image_url ??
      first.items[0]?.image_url ??
      null
    );
  }
  if (p.type === "interaction") {
    if (p.subtype === "presentation_interactive") {
      return p.slides[0]?.background_image_url ?? null;
    }
    if ("image_url" in p && p.image_url) return p.image_url;
    if (p.subtype === "sound_sort") return p.choices[0]?.image_url ?? null;
  }
  return null;
}
