/** Sentence-strip collaborative activity spike (P3). */

export type SentenceStripTile = {
  id: string;
  text: string;
};

export type SentenceStripPrompt = {
  title: string;
  instructions: string;
  /** Shuffled word bank shown to students. */
  tiles: SentenceStripTile[];
  /** Optional target for teacher review (not shown to students in spike). */
  targetSentence?: string;
};

export type SentenceStripBoardState = {
  boardId: string;
  orderedTileIds: string[];
  status: "WAITING" | "ACTIVE" | "SUBMITTED" | "RETURNED";
  feedback: string | null;
};

export function boardIdForStudent(studentId: string): string {
  return `strip:student:${studentId}`;
}

export function assembleSentence(
  tiles: SentenceStripTile[],
  orderedTileIds: string[],
): string {
  const byId = new Map(tiles.map((t) => [t.id, t.text]));
  return orderedTileIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .join(" ");
}

export function createDefaultPrompt(): SentenceStripPrompt {
  return {
    title: "Build the sentence",
    instructions: "Drag the words into order. Submit when ready.",
    tiles: [
      { id: "t1", text: "The" },
      { id: "t2", text: "cat" },
      { id: "t3", text: "is" },
      { id: "t4", text: "on" },
      { id: "t5", text: "the" },
      { id: "t6", text: "mat" },
    ],
    targetSentence: "The cat is on the mat",
  };
}

export function shuffleTileOrder(tiles: SentenceStripTile[]): string[] {
  const ids = tiles.map((t) => t.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ids[i]!;
    ids[i] = ids[j]!;
    ids[j] = tmp;
  }
  return ids;
}
