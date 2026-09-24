export type MysteryDifficulty = "easy" | "medium" | "hard";

export type EvidenceType =
  | "physical"
  | "statement"
  | "observation"
  | "location"
  | "document"
  | "photo";

export type EvidenceImportance = "supporting" | "important" | "key";

export type PercentRect = {
  /** Percent from the left edge. */
  x: number;
  /** Percent from the top edge. */
  y: number;
  /** Percent of the scene width. */
  width: number;
  /** Percent of the scene height. */
  height: number;
};

export type MysteryCondition =
  | { type: "clue_discovered"; clueId: string }
  | { type: "hotspot_inspected"; hotspotId: string }
  | { type: "question_asked"; questionId: string }
  | { type: "event_triggered"; eventId: string }
  | { type: "scene_visited"; sceneId: string }
  | { type: "clue_count"; minimum: number };

export type MysteryHotspotAction =
  | { type: "discover_clue"; clueId: string; text?: string }
  | { type: "inspect"; text: string }
  | { type: "change_scene"; sceneId: string; text?: string }
  | { type: "open_character"; characterId: string; text?: string }
  | { type: "trigger_event"; eventId: string; text?: string };

export type MysteryHotspotDefinition = {
  id: string;
  label: string;
  area: PercentRect;
  action: MysteryHotspotAction;
  conditions?: MysteryCondition[];
  hideUntilAvailable?: boolean;
};

export type MysterySceneDefinition = {
  id: string;
  title: string;
  description?: string;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  hotspots: MysteryHotspotDefinition[];
};

export type MysteryClue = {
  id: string;
  title: string;
  description: string;
  type: EvidenceType;
  importance: EvidenceImportance;
  foundAt: string;
  prompt?: string;
};

export type InterviewQuestion = {
  id: string;
  question: string;
  answer: string;
  conditions?: MysteryCondition[];
  reveals?: { clueId?: string; eventId?: string; questionId?: string };
};

export type MysteryCharacter = {
  id: string;
  name: string;
  role?: string;
  intro: string;
  portrait?: string;
  questions: InterviewQuestion[];
};

export type MysteryEvent = {
  id: string;
  conditions: MysteryCondition[];
  actions: MysteryHotspotAction[];
};

export type MysteryAccusation = {
  questions: {
    id: string;
    prompt: string;
    options: { id: string; label: string }[];
  }[];
  requiredEvidenceIds?: string[];
};

export type MysterySolution = {
  answers: Record<string, string>;
  explanation: string;
};

export type MysteryDefinition = {
  schemaVersion: 1;
  contentVersion: string;
  id: string;
  title: string;
  description: string;
  difficulty: MysteryDifficulty;
  estimatedMinutes: number;
  learning: {
    gradeBand: string;
    cefr?: string;
    objective: string;
    successCriteria: string[];
    languageTargets?: string[];
  };
  intro: { eyebrow?: string; setup: string[]; mission: string };
  initialSceneId: string;
  scenes: MysterySceneDefinition[];
  clues: MysteryClue[];
  /** Phase 2-ready content. Phase 1 safely accepts empty lists. */
  characters?: MysteryCharacter[];
  events?: MysteryEvent[];
  accusation?: MysteryAccusation;
  solution?: MysterySolution;
};

export type MysteryPlayerPhase = "intro" | "investigation" | "solved";

export type MysteryPlayerState = {
  schemaVersion: 1;
  mysteryId: string;
  contentVersion: string;
  phase: MysteryPlayerPhase;
  currentSceneId: string;
  discoveredClueIds: string[];
  inspectedHotspotIds: string[];
  openedCharacterIds: string[];
  askedQuestionIds: string[];
  triggeredEventIds: string[];
  visitedSceneIds: string[];
  accusationAttempts: number;
  solved: boolean;
};
