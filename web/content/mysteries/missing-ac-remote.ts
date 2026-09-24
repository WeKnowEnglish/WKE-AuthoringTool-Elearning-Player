import type { MysteryDefinition } from "@/lib/mystery/types";

export const missingAcRemoteMystery = {
  schemaVersion: 1,
  contentVersion: "1.0.0",
  id: "missing-ac-remote",
  title: "The Missing A/C Remote",
  description: "A click-and-solve classroom mystery for careful observers.",
  difficulty: "easy",
  estimatedMinutes: 6,
  learning: {
    gradeBand: "Grade 5",
    cefr: "A2",
    objective:
      "Use classroom observations and evidence language to build a simple explanation of events.",
    successCriteria: [
      "I can inspect a scene carefully.",
      "I can separate useful evidence from distractions.",
      "I can explain what a clue might show.",
    ],
    languageTargets: [
      "I found…",
      "This clue shows…",
      "First…, then…, so…",
    ],
  },
  intro: {
    eyebrow: "Case 001 · Green Valley Classroom",
    setup: [
      "The classroom is getting warmer, but the A/C remote is missing from its holder.",
      "Mrs. Harper remembers seeing it this morning. Nobody has left the classroom since lunch.",
    ],
    mission:
      "Search the classroom, collect the useful clues, and prepare an evidence-based explanation.",
  },
  initialSceneId: "classroom",
  scenes: [
    {
      id: "classroom",
      title: "Green Valley Classroom",
      description:
        "Look closely. Some objects are evidence; others simply help you rule out a possibility.",
      image: {
        src: "/mysteries/missing-ac-remote/classroom.svg",
        alt: "A bright classroom with an A/C unit, notice board, bookshelf, teacher desk, moved chair, backpack, and trash bin.",
        width: 1600,
        height: 900,
      },
      hotspots: [
        {
          id: "morning-photo",
          label: "morning class photo",
          area: { x: 6, y: 11, width: 18, height: 24 },
          action: {
            type: "discover_clue",
            clueId: "remote-seen-this-morning",
          },
        },
        {
          id: "bookshelf",
          label: "bookshelf",
          area: { x: 4, y: 39, width: 22, height: 47 },
          action: { type: "discover_clue", clueId: "shelf-dust-mark" },
        },
        {
          id: "teacher-desk",
          label: "teacher desk",
          area: { x: 32, y: 60, width: 27, height: 24 },
          action: {
            type: "inspect",
            text: "The teacher's desk is tidy. The drawers are closed, and the remote is not here.",
          },
        },
        {
          id: "moved-chair",
          label: "chair near the bookshelf",
          area: { x: 58, y: 54, width: 12, height: 31 },
          action: { type: "discover_clue", clueId: "moved-chair" },
        },
        {
          id: "backpack",
          label: "blue backpack",
          area: { x: 70, y: 68, width: 11, height: 18 },
          action: {
            type: "inspect",
            text: "The backpack is zipped. Its owner says you may look beside it, but there is no remote there.",
          },
        },
        {
          id: "trash-bin",
          label: "trash bin",
          area: { x: 88, y: 65, width: 9, height: 23 },
          action: { type: "discover_clue", clueId: "dead-batteries" },
        },
        {
          id: "remote-holder",
          label: "empty remote holder",
          area: { x: 84, y: 22, width: 9, height: 15 },
          action: { type: "discover_clue", clueId: "empty-holder" },
        },
      ],
    },
  ],
  clues: [
    {
      id: "remote-seen-this-morning",
      title: "Morning Photo",
      description:
        "The class photo from 9:05 shows the remote inside its wall holder.",
      type: "photo",
      importance: "key",
      foundAt: "Notice board",
      prompt: "What does this tell you about when the remote disappeared?",
    },
    {
      id: "shelf-dust-mark",
      title: "Clean Mark on the Shelf",
      description:
        "A small remote-shaped rectangle has no dust, but the shelf around it does.",
      type: "observation",
      importance: "key",
      foundAt: "Bookshelf",
      prompt: "What object may have rested here recently?",
    },
    {
      id: "moved-chair",
      title: "Moved Chair",
      description:
        "One chair is beside the tall bookshelf instead of under a desk.",
      type: "location",
      importance: "important",
      foundAt: "Beside the bookshelf",
      prompt: "Why might someone move a chair to this spot?",
    },
    {
      id: "dead-batteries",
      title: "Two Dead Batteries",
      description:
        "Two used AAA batteries are on top of the classroom trash.",
      type: "physical",
      importance: "important",
      foundAt: "Trash bin",
      prompt: "Which classroom object uses two small batteries?",
    },
    {
      id: "empty-holder",
      title: "Empty Remote Holder",
      description:
        "The holder is undamaged. Its label says the remote should be returned after use.",
      type: "observation",
      importance: "supporting",
      foundAt: "Wall beside the A/C",
      prompt:
        "Does the holder look broken, or did someone remove the remote normally?",
    },
  ],
  characters: [],
  events: [],
} satisfies MysteryDefinition;
