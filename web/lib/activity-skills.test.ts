import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivitySkillPicker } from "@/components/teacher/activity-builder/ActivitySkillPicker";
import { ACTIVITY_TRACK_PART_CATALOG } from "@/lib/activity-tracks/types";
import {
  ACTIVITY_SKILL_LABELS,
  ACTIVITY_SKILL_TYPES,
  ACTIVITY_TRACK_PART_SKILLS,
  LEARNING_TRACK_BEAT_SKILLS,
  groupActivityOptionsBySkill,
} from "@/lib/activity-skills";
import { LEARNING_TRACK_BEAT_KIND_OPTIONS } from "@/lib/learning-tracks/composition-types";

describe("Track builder activity skill groups", () => {
  it("uses the six requested skill types in display order", () => {
    expect(ACTIVITY_SKILL_TYPES).toEqual([
      "vocabulary",
      "grammar",
      "speaking",
      "listening",
      "reading",
      "writing",
    ]);
  });

  it("assigns every Practice activity to a skill", () => {
    expect(Object.keys(LEARNING_TRACK_BEAT_SKILLS).sort()).toEqual(
      [...LEARNING_TRACK_BEAT_KIND_OPTIONS].sort(),
    );
  });

  it("assigns every Graded activity to a skill", () => {
    expect(Object.keys(ACTIVITY_TRACK_PART_SKILLS).sort()).toEqual(
      ACTIVITY_TRACK_PART_CATALOG.map((entry) => entry.kind).sort(),
    );
  });

  it("keeps all six groups visible when a mode has no options for a skill", () => {
    const groups = groupActivityOptionsBySkill([
      { id: "cards", label: "Flashcards", skill: "vocabulary" },
    ]);

    expect(groups).toHaveLength(6);
    expect(groups.find((group) => group.skill === "vocabulary")?.options).toHaveLength(1);
    expect(groups.find((group) => group.skill === "speaking")?.options).toEqual([]);
  });

  it("renders all six skill headings in the activity picker", () => {
    const html = renderToStaticMarkup(
      createElement(ActivitySkillPicker, {
        options: [{ id: "cards", label: "Flashcards", skill: "vocabulary" }],
        onChoose: () => undefined,
      }),
    );

    for (const skill of ACTIVITY_SKILL_TYPES) {
      expect(html).toContain(ACTIVITY_SKILL_LABELS[skill]);
    }
  });
});
