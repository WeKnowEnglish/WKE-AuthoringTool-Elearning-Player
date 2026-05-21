import type { VocabularySetDefinition } from "../types";
import { schoolActivityWord } from "./vocab-set-helpers";
import { SCHOOL_ACTIVITIES_COVER_URL, SCHOOL_ACTIVITIES_MEDIA_URLS } from "./school-media";

const M = SCHOOL_ACTIVITIES_MEDIA_URLS;

export const A1_SCHOOL_ACTIVITIES: VocabularySetDefinition = {
  id: "school_activities",
  title: "School Activities",
  learnPhraseTheme: "school_activities",
  coverImageUrl: SCHOOL_ACTIVITIES_COVER_URL,
  words: [
    schoolActivityWord(M, "write", "write"),
    schoolActivityWord(M, "draw", "draw"),
    schoolActivityWord(M, "read", "read"),
    schoolActivityWord(M, "paint", "paint"),
    schoolActivityWord(M, "play", "play"),
    schoolActivityWord(M, "sing", "sing"),
    schoolActivityWord(M, "ball", "ball", {
      grammar: "count",
      clozeA: "I play with a __1__.",
      clozeB: "We play with a __1__.",
      placeholderHex: "fde68a",
      placeholderInk: "92400e",
    }),
    schoolActivityWord(M, "guitar", "guitar", {
      grammar: "count",
      clozeA: "I play the __1__.",
      clozeB: "We play the __1__.",
      placeholderHex: "fcd34d",
      placeholderInk: "a16207",
    }),
    schoolActivityWord(M, "run", "run"),
    schoolActivityWord(M, "jump", "jump"),
    schoolActivityWord(M, "study", "study"),
    schoolActivityWord(M, "listen", "listen"),
    schoolActivityWord(M, "talk", "talk"),
    schoolActivityWord(M, "homework", "homework", { grammar: "uncountable" }),
    schoolActivityWord(M, "recess", "recess", { grammar: "uncountable" }),
  ],
  falseClaims: {
    write: ["This is draw.", "This is read."],
    draw: ["This is write.", "This is paint."],
    read: ["This is write.", "This is draw."],
    paint: ["This is draw.", "This is write."],
    play: ["This is sing.", "This is run."],
    sing: ["This is play.", "This is draw."],
    ball: ["This is a guitar.", "This is play."],
    guitar: ["This is a ball.", "This is sing."],
    run: ["This is jump.", "This is play."],
    jump: ["This is run.", "This is play."],
    study: ["This is read.", "This is write."],
    listen: ["This is talk.", "This is sing."],
    talk: ["This is listen.", "This is read."],
    homework: ["This is recess.", "This is study."],
    recess: ["This is homework.", "This is play."],
  },
  learnExcludeWordIds: ["homework", "recess", "study"],
};
