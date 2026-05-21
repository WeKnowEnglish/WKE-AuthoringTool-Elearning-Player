import type { VocabularySetDefinition } from "../types";
import { jobWord } from "./vocab-set-helpers";
import { JOBS_COMMUNITY_COVER_URL, JOBS_COMMUNITY_MEDIA_URLS } from "./jobs-media";

const M = JOBS_COMMUNITY_MEDIA_URLS;

export const A1_JOBS_COMMUNITY: VocabularySetDefinition = {
  id: "jobs_community",
  title: "Community Jobs",
  learnPhraseTheme: "jobs_community",
  coverImageUrl: JOBS_COMMUNITY_COVER_URL,
  words: [
    jobWord(M, "doctor", "doctor", { placeholderHex: "fecaca", placeholderInk: "991b1b" }),
    jobWord(M, "nurse", "nurse", { placeholderHex: "fbcfe8", placeholderInk: "9d174d" }),
    jobWord(M, "firefighter", "firefighter", { placeholderHex: "fed7aa", placeholderInk: "c2410c" }),
    jobWord(M, "police", "police", { placeholderHex: "bfdbfe", placeholderInk: "1e40af" }),
    jobWord(M, "vet", "vet", { placeholderHex: "bbf7d0", placeholderInk: "166534" }),
    jobWord(M, "teacher", "teacher", { placeholderHex: "fde68a", placeholderInk: "92400e" }),
    jobWord(M, "chef", "chef", { placeholderHex: "fecaca", placeholderInk: "b91c1c" }),
    jobWord(M, "pilot", "pilot", { placeholderHex: "bae6fd", placeholderInk: "0369a1" }),
    jobWord(M, "builder", "builder", { placeholderHex: "d6d3d1", placeholderInk: "44403c" }),
    jobWord(M, "mechanic", "mechanic", { placeholderHex: "e5e7eb", placeholderInk: "374151" }),
    jobWord(M, "librarian", "librarian", { placeholderHex: "ddd6fe", placeholderInk: "5b21b6" }),
    jobWord(M, "principal", "principal", { placeholderHex: "c4b5fd", placeholderInk: "6d28d9" }),
    jobWord(M, "waiter", "waiter", { placeholderHex: "fef3c7", placeholderInk: "a16207" }),
    jobWord(M, "waitress", "waitress", { placeholderHex: "fce7f3", placeholderInk: "9d174d" }),
    jobWord(M, "detective", "detective", { placeholderHex: "e0e7ff", placeholderInk: "4338ca" }),
  ],
  falseClaims: {
    doctor: ["She is a nurse.", "He is a vet."],
    nurse: ["He is a doctor.", "She is a teacher."],
    firefighter: ["He is a police officer.", "She is a builder."],
    police: ["He is a firefighter.", "She is a detective."],
    vet: ["He is a doctor.", "She is a zookeeper."],
    teacher: ["He is a principal.", "She is a librarian."],
    chef: ["He is a waiter.", "She is a pilot."],
    pilot: ["He is a builder.", "She is a mechanic."],
    builder: ["He is a mechanic.", "She is a firefighter."],
    mechanic: ["He is a builder.", "She is an electrician."],
    librarian: ["He is a teacher.", "She is a principal."],
    principal: ["He is a teacher.", "She is a librarian."],
    waiter: ["He is a chef.", "She is a waitress."],
    waitress: ["He is a waiter.", "She is a chef."],
    detective: ["He is a police officer.", "She is a reporter."],
  },
  learnExcludeWordIds: ["waitress", "principal", "detective"],
};
