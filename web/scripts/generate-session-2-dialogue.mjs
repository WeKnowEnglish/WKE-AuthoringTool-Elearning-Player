import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
dotenv.config({ path: path.join(webRoot, ".env.local") });

const dialoguePath = path.join(webRoot, "content", "voices", "session-2-dialogue-draft.md");
const voiceConfigPath = path.join(webRoot, "content", "voices", "session-2-character-voices.json");
const audioRoot = path.join(webRoot, "public", "curriculum", "grade-4-movers", "characters", "audio");
const generatedModulePath = path.join(webRoot, "lib", "curriculum", "session-2-dialogue.generated.ts");
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");
const speakersArgument = process.argv.find((argument) => argument.startsWith("--speakers="));
const requestedSpeakers = speakersArgument
  ? new Set(speakersArgument.slice("--speakers=".length).split(",").map((speaker) => speaker.trim()).filter(Boolean))
  : null;

function parseDialogue(markdown) {
  const clips = [];
  const blockPattern = /^### `(s2-[^`]+)`\s*\r?\n([\s\S]*?)(?=^### `|^## |(?![\s\S]))/gm;
  for (const match of markdown.matchAll(blockPattern)) {
    const id = match[1];
    const block = match[2];
    const speaker = block.match(/\*\*Speaker:\*\*\s+([^\r\n]+)/)?.[1]?.trim();
    const text = block.match(/\*\*Line:\*\*\s+“([^”]+)”/)?.[1]?.trim();
    const direction = block.match(/\*\*Direction:\*\*\s+([^\r\n]+)/)?.[1]?.trim() ?? "";
    if (speaker && text) clips.push({ id, speaker, text, direction });
  }
  const duplicates = clips.filter((clip, index) => clips.findIndex((item) => item.id === clip.id) !== index);
  if (duplicates.length) throw new Error(`Duplicate dialogue IDs: ${duplicates.map((clip) => clip.id).join(", ")}`);
  return clips;
}

async function isCompleteFile(filePath) {
  try { return (await stat(filePath)).size > 1000; } catch { return false; }
}

function wait(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
function speakerSlug(speaker) { return speaker.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

async function generateClip({ apiKey, config, clip, overwrite = false }) {
  const character = config.characters[clip.speaker];
  if (!character) throw new Error(`No voice protocol for ${clip.speaker}.`);
  const outputDir = path.join(audioRoot, speakerSlug(clip.speaker), "session-2");
  const outputPath = path.join(outputDir, `${clip.id}.${config.format}`);
  await mkdir(outputDir, { recursive: true });
  if (!overwrite && await isCompleteFile(outputPath)) {
    console.log(`Kept    ${clip.id}`);
    return;
  }
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          voice: character.voice,
          input: clip.text,
          instructions: `${character.instructions}\n\nPerformance direction for this clip: ${clip.direction || "Keep it natural, short, and immediately actionable."}`,
          response_format: config.format,
          speed: character.speed,
        }),
      });
      if (!response.ok) throw new Error(`OpenAI speech generation failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
      const temporaryPath = `${outputPath}.tmp`;
      await writeFile(temporaryPath, Buffer.from(await response.arrayBuffer()));
      if (!await isCompleteFile(temporaryPath)) throw new Error("The generated audio file was unexpectedly small.");
      await rename(temporaryPath, outputPath);
      console.log(`Created ${clip.id} (${clip.speaker})`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 1200);
    }
  }
  throw lastError;
}

async function runPool(items, worker, concurrency = 4) {
  let cursor = 0;
  async function runWorker() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
}

async function writeManifests({ clips, config }) {
  const entries = Object.fromEntries(clips.map((clip) => {
    const slug = speakerSlug(clip.speaker);
    const protocol = config.characters[clip.speaker].protocol;
    return [clip.id, { speaker: clip.speaker, text: clip.text, audioUrl: `/curriculum/grade-4-movers/characters/audio/${slug}/session-2/${clip.id}.${config.format}?v=${encodeURIComponent(protocol)}`, playbackRate: config.characters[clip.speaker].playbackRate ?? 1 }];
  }));
  const manifest = {
    session: "grade-4-unit-1-session-2",
    model: config.model,
    format: config.format,
    clipCount: clips.length,
    voices: Object.fromEntries(Object.entries(config.characters).map(([name, character]) => [name, { voice: character.voice, speed: character.speed, playbackRate: character.playbackRate ?? 1, protocol: character.protocol }])),
    clips: entries,
  };
  const manifestDir = path.join(audioRoot, "session-2");
  await mkdir(manifestDir, { recursive: true });
  await writeFile(path.join(manifestDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const source = `// Generated by scripts/generate-session-2-dialogue.mjs.\n// Edit content/voices/session-2-dialogue-draft.md, then regenerate.\n\nexport const SESSION_2_DIALOGUE = ${JSON.stringify(entries, null, 2)} as const;\n\nexport type Session2DialogueId = keyof typeof SESSION_2_DIALOGUE;\n`;
  await writeFile(generatedModulePath, source, "utf8");
}

async function main() {
  const [markdown, configText] = await Promise.all([readFile(dialoguePath, "utf8"), readFile(voiceConfigPath, "utf8")]);
  const clips = parseDialogue(markdown);
  if (clips.length !== 50) throw new Error(`Expected 50 approved clips, but parsed ${clips.length}.`);
  const config = JSON.parse(configText);
  for (const clip of clips) if (!config.characters[clip.speaker]) throw new Error(`Missing voice protocol for ${clip.speaker}.`);
  if (requestedSpeakers) {
    const unknownSpeakers = [...requestedSpeakers].filter((speaker) => !config.characters[speaker]);
    if (unknownSpeakers.length) throw new Error(`Unknown requested speakers: ${unknownSpeakers.join(", ")}.`);
  }
  console.log(`Validated ${clips.length} Session 2 clips across ${new Set(clips.map((clip) => clip.speaker)).size} voices.`);
  if (dryRun) return;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured in web/.env.local.");
  const clipsToGenerate = requestedSpeakers
    ? clips.filter((clip) => requestedSpeakers.has(clip.speaker))
    : clips;
  if (!clipsToGenerate.length) throw new Error("No dialogue clips matched the requested speakers.");
  const overwrite = force || requestedSpeakers !== null;
  console.log(`Generating ${clipsToGenerate.length} clip(s) for ${requestedSpeakers ? [...requestedSpeakers].join(", ") : "all speakers"}.`);
  await runPool(clipsToGenerate, (clip) => generateClip({ apiKey, config, clip, overwrite }));
  await writeManifests({ clips, config });
  console.log(`Ready: ${clips.length}/${clips.length} clips plus manifest and typed dialogue map.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
