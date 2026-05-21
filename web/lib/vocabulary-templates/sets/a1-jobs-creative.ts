import type { VocabularySetDefinition } from "../types";
import { jobWord } from "./vocab-set-helpers";
import { JOBS_CREATIVE_COVER_URL, JOBS_CREATIVE_MEDIA_URLS } from "./jobs-media";

const M = JOBS_CREATIVE_MEDIA_URLS;

export const A1_JOBS_CREATIVE: VocabularySetDefinition = {
  id: "jobs_creative",
  title: "More Jobs",
  learnPhraseTheme: "jobs_creative",
  coverImageUrl: JOBS_CREATIVE_COVER_URL,
  words: [
    jobWord(M, "actor", "actor", { placeholderHex: "fde68a", placeholderInk: "92400e" }),
    jobWord(M, "actress", "actress", { placeholderHex: "fbcfe8", placeholderInk: "9d174d" }),
    jobWord(M, "artist", "artist", { placeholderHex: "ddd6fe", placeholderInk: "5b21b6" }),
    jobWord(M, "clown", "clown", { placeholderHex: "fecaca", placeholderInk: "991b1b" }),
    jobWord(M, "acrobat", "acrobat", { placeholderHex: "fed7aa", placeholderInk: "c2410c" }),
    jobWord(M, "biologist", "biologist", { placeholderHex: "bbf7d0", placeholderInk: "166534" }),
    jobWord(M, "electrician", "electrician", { placeholderHex: "fef08a", placeholderInk: "a16207" }),
    jobWord(M, "zookeeper", "zookeeper", { placeholderHex: "d9f99d", placeholderInk: "3f6212" }),
    jobWord(M, "banker", "banker", { placeholderHex: "e0e7ff", placeholderInk: "4338ca" }),
    jobWord(M, "reporter", "reporter", { placeholderHex: "bae6fd", placeholderInk: "0369a1" }),
    jobWord(M, "computer_programmer", "computer programmer", {
      tts: "computer programmer",
      placeholderHex: "c7d2fe",
      placeholderInk: "4338ca",
    }),
    jobWord(M, "farmer", "farmer", { placeholderHex: "bbf7d0", placeholderInk: "15803d" }),
    jobWord(M, "engineer", "engineer", { placeholderHex: "d1d5db", placeholderInk: "374151" }),
    jobWord(M, "lawyer", "lawyer", { placeholderHex: "e5e7eb", placeholderInk: "1f2937" }),
    jobWord(M, "judge", "judge", { placeholderHex: "fde68a", placeholderInk: "a16207" }),
  ],
  falseClaims: {
    actor: ["She is an actress.", "He is a clown."],
    actress: ["He is an actor.", "She is an artist."],
    artist: ["He is an actor.", "She is a clown."],
    clown: ["He is an acrobat.", "She is an actor."],
    acrobat: ["He is a clown.", "She is an actor."],
    biologist: ["He is a vet.", "She is a zookeeper."],
    electrician: ["He is a mechanic.", "She is a builder."],
    zookeeper: ["He is a vet.", "She is a biologist."],
    banker: ["He is a reporter.", "She is a teacher."],
    reporter: ["He is a detective.", "She is a teacher."],
    computer_programmer: ["He is an engineer.", "She is a teacher."],
    farmer: ["He is a builder.", "She is a chef."],
    engineer: ["He is a builder.", "She is a mechanic."],
    lawyer: ["He is a judge.", "She is a teacher."],
    judge: ["He is a lawyer.", "She is a police officer."],
  },
  learnExcludeWordIds: ["computer_programmer", "lawyer", "judge"],
};
