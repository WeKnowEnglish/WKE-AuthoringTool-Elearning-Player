import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
dotenv.config({ path: path.join(webRoot, ".env.local") });

const configPath = path.join(webRoot, "content", "voices", "keelan-voice-sample.json");
const outputDir = path.join(
  webRoot,
  "public",
  "curriculum",
  "grade-4-movers",
  "characters",
  "audio",
  "keelan",
  "samples",
);

function selectedVoices(config) {
  const voiceArgument = process.argv.find((argument) => argument.startsWith("--voice="));
  if (!voiceArgument) return config.candidateVoices;
  const requested = voiceArgument.slice("--voice=".length).trim();
  if (!config.candidateVoices.includes(requested)) {
    throw new Error(`Unknown Keelan candidate voice: ${requested}`);
  }
  return [requested];
}

async function generateSample({ apiKey, config, voice }) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      voice,
      input: config.sampleDialogue,
      instructions: config.instructions,
      response_format: config.format,
      speed: config.speed,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI speech generation failed for ${voice} (${response.status}): ${detail.slice(0, 500)}`);
  }

  const sampleSuffix = typeof config.sampleId === "string" && config.sampleId.trim()
    ? `-${config.sampleId.trim().replace(/[^a-z0-9_-]/gi, "-")}`
    : "-sample";
  const outputPath = path.join(outputDir, `keelan-${voice}${sampleSuffix}.${config.format}`);
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  return outputPath;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to web/.env.local, then run npm run voice:keelan-samples.",
    );
  }
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const voices = selectedVoices(config);
  await mkdir(outputDir, { recursive: true });

  console.log(`Generating ${voices.length} Keelan voice sample${voices.length === 1 ? "" : "s"}...`);
  for (const voice of voices) {
    const outputPath = await generateSample({ apiKey, config, voice });
    console.log(`Created ${path.relative(webRoot, outputPath)}`);
  }
  console.log("Listen to the samples and keep the voice name that best fits Keelan.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
