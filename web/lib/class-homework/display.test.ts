import { describe, expect, it } from "vitest";
import {
  formatHomeworkListSubtitle,
  formatPackQuizHomeworkExtras,
  packQuizEmptyDropdownCopy,
  resolvePackTitleForQuiz,
} from "@/lib/class-homework/display";

describe("class-homework/display", () => {
  it("resolves pack title from quiz options", () => {
    const title = resolvePackTitleForQuiz(
      "q1",
      [{ id: "q1", packId: "p1" }],
      new Map([["p1", "Animals"]]),
    );
    expect(title).toBe("Animals");
    expect(resolvePackTitleForQuiz("q2", [{ id: "q1", packId: "p1" }], new Map())).toBeNull();
  });

  it("formats pack quiz extras and list subtitle", () => {
    expect(
      formatPackQuizHomeworkExtras(
        {
          type: "pack_quiz",
          quizId: "q1",
          quizTitle: "Pets MC",
          questionCount: 4,
          questions: [
            {
              id: "a",
              wordId: "a",
              mode: "find_lemma",
              payload: {
                type: "interaction",
                subtype: "mc_quiz",
                question: "Find: cat",
                options: [
                  { id: "a", label: "cat" },
                  { id: "b", label: "dog" },
                  { id: "c", label: "bird" },
                  { id: "d", label: "fish" },
                ],
                correct_option_id: "a",
                shuffle_options: false,
                image_fit: "contain",
              },
            },
          ],
        },
        "Animals",
      ),
    ).toBe("from Animals · frozen");

    expect(
      formatHomeworkListSubtitle(
        {
          type: "pack_quiz",
          quizId: "q1",
          quizTitle: "Pets MC",
          questionCount: 4,
        },
        { packTitle: "Animals", dueLabel: "No due date" },
      ),
    ).toContain("Pets MC");
  });

  it("returns tiered empty dropdown copy", () => {
    expect(packQuizEmptyDropdownCopy("no_packs").body).toMatch(/Link a word pack/i);
    expect(packQuizEmptyDropdownCopy("no_quizzes").body).toMatch(/No saved quizzes/i);
  });
});
