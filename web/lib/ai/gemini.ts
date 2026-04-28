import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  interactionPayloadSchema,
  startPayloadSchema,
  storyPayloadSchema,
} from "@/lib/lesson-schemas";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export type DraftScreenRow = {
  screen_type: "start" | "story" | "interaction";
  payload: unknown;
};

export async function generateLessonDrafts(input: {
  title: string;
  gradeBand: string;
  goal: string;
  vocabulary: string;
  premise: string;
}): Promise<DraftScreenRow[]> {
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    throw new Error(
      "Remove NEXT_PUBLIC_GEMINI_API_KEY — Gemini keys must not use the NEXT_PUBLIC_ prefix (they would ship to the browser).",
    );
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are an English language teacher writing digital lessons for Vietnamese primary students (grades 3-5).
Create a short narrative lesson as JSON ONLY with this exact shape:
{
  "screens": [
    { "screen_type": "start", "payload": { ... } },
    { "screen_type": "story", "payload": { ... } },
    ...
  ]
}

Rules:
- Use simple English, short sentences, friendly tone.
- Include exactly one "start" screen first, then 2-3 "story" screens, then 1 "interaction" with subtype "mc_quiz".
- (Teachers can add other interaction types from the editor: true_false, short_answer, fill_blanks, fix_text, essay, click_targets, hotspot_info, hotspot_gate, drag_sentence, drag_match — not generated here.)
- start payload: { "type": "start", "image_url": string (use https://placehold.co/800x520/... descriptive path), "cta_label": "Start learning" }
- story payload: { "type": "story", "image_url": string (placehold.co), "body_text": string, "read_aloud_text": same as body_text, "tts_lang": "en-US", optional "guide": { "tip_text": string } }
- mc_quiz payload: { "type": "interaction", "subtype": "mc_quiz", "question": string, "options": [{"id":"a","label":"..."}], "correct_option_id": string matching one id, optional "guide": { "tip_text": string } }
- Options need at least 2 items with ids a,b,c...

Lesson meta:
Title: ${input.title}
Grade band: ${input.gradeBand}
Learning goal: ${input.goal}
Vocabulary to include: ${input.vocabulary}
Story premise: ${input.premise}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Model did not return valid JSON");
  }
  const obj = parsed as { screens?: unknown };
  if (!Array.isArray(obj.screens)) {
    throw new Error("Missing screens array");
  }

  const out: DraftScreenRow[] = [];
  for (const row of obj.screens) {
    const r = row as { screen_type?: string; payload?: unknown };
    if (!r.screen_type || r.payload === undefined) continue;
    if (r.screen_type === "start") {
      startPayloadSchema.parse(r.payload);
      out.push({ screen_type: "start", payload: r.payload });
    } else if (r.screen_type === "story") {
      storyPayloadSchema.parse(r.payload);
      out.push({ screen_type: "story", payload: r.payload });
    } else if (r.screen_type === "interaction") {
      interactionPayloadSchema.parse(r.payload);
      out.push({ screen_type: "interaction", payload: r.payload });
    }
  }
  if (out.length === 0) {
    throw new Error("No valid screens parsed");
  }
  return out;
}
