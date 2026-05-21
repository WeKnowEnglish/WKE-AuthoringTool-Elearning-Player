import { describe, expect, it } from "vitest";
import { A1_CLOTHES_EVERYDAY } from "./sets/a1-clothes-everyday";
import { A1_FARM_ANIMALS } from "./sets/a1-farm-animals";
import { A1_PETS } from "./sets/a1-pets";
import { A1_BODY_HEAD_FACE } from "./sets/a1-body-head-face";
import { A1_JOBS_COMMUNITY } from "./sets/a1-jobs-community";
import { A1_SCHOOL_ACTIVITIES } from "./sets/a1-school-activities";
import { A1_SCHOOL_SUPPLIES } from "./sets/a1-school-supplies";
import { A1_TOYS_EVERYDAY } from "./sets/a1-toys-everyday";
import { A1_WEATHER_WORDS } from "./sets/a1-weather-words";
import type { VocabWord } from "./types";
import {
  learnPhraseStatement,
  learnSpeechText,
  pickLearnPhraseVariant,
  wearObjectPhrase,
} from "./vocab-learn-phrases";

function word(
  id: string,
  lemma: string,
  opts?: { grammar?: VocabWord["grammar"] },
): Pick<VocabWord, "id" | "lemma" | "grammar" | "mealVerb"> {
  return { id, lemma, grammar: opts?.grammar, mealVerb: "none" };
}

describe("wearObjectPhrase", () => {
  it("uses article for singular count nouns", () => {
    expect(wearObjectPhrase(word("shirt", "shirt"))).toBe("a shirt");
    expect(wearObjectPhrase(word("hat", "hat"))).toBe("a hat");
  });

  it("omits article for plural", () => {
    expect(wearObjectPhrase(word("jeans", "jeans", { grammar: "plural" }))).toBe("jeans");
    expect(wearObjectPhrase(word("shoes", "shoes", { grammar: "plural" }))).toBe("shoes");
  });
});

describe("clothes learn phrases", () => {
  it("never uses I like for clothes theme", () => {
    const shirt = word("shirt", "shirt");
    for (let i = 0; i < 30; i++) {
      const text = learnSpeechText(shirt, `clothes-${i}`, "clothes");
      expect(text).not.toMatch(/^I like /i);
      expect(text).not.toMatch(/^I don't like /i);
      expect(text.toLowerCase()).toContain("wearing");
    }
  });

  it("builds named and subject variants", () => {
    expect(
      learnPhraseStatement(word("jacket", "jacket"), "i_am_wearing", "seed", "clothes"),
    ).toBe("I am wearing a jacket.");
    expect(
      learnPhraseStatement(word("dress", "dress"), "friend_wearing", "seed", "clothes"),
    ).toBe("My friend is wearing a dress.");
    const named = learnPhraseStatement(
      word("scarf", "scarf"),
      "named_wearing",
      "fixed-name-seed",
      "clothes",
    );
    expect(named).toMatch(/^(John|Bill|Sarah|Elly) is wearing a scarf\.$/);
  });

  it("clothes set declares clothes theme", () => {
    expect(A1_CLOTHES_EVERYDAY.learnPhraseTheme).toBe("clothes");
  });
});

describe("weather learn phrases", () => {
  it("uses It is / Today is for adjectives", () => {
    expect(
      learnPhraseStatement(word("sunny", "sunny"), "it_is", "s", "weather"),
    ).toBe("It is sunny.");
    expect(
      learnPhraseStatement(word("rainy", "rainy"), "today_is", "s", "weather"),
    ).toBe("Today is rainy.");
  });

  it("uses I see the for sun and cloud", () => {
    expect(
      learnPhraseStatement(word("sun", "sun"), "i_see_the", "s", "weather"),
    ).toBe("I see the sun.");
    expect(
      learnPhraseStatement(word("cloud", "cloud"), "i_see_the", "s", "weather"),
    ).toBe("I see the cloud.");
  });

  it("uses I see without the for mass weather nouns", () => {
    expect(
      learnPhraseStatement(word("rain", "rain"), "i_see", "s", "weather"),
    ).toBe("I see rain.");
  });

  it("only picks valid weather variants per word", () => {
    for (let i = 0; i < 20; i++) {
      const v = pickLearnPhraseVariant(word("sunny", "sunny"), `w-${i}`, "weather");
      expect(["it_is", "today_is"]).toContain(v);
      const rainV = pickLearnPhraseVariant(word("rain", "rain"), `w-${i}`, "weather");
      expect(["i_see"]).toContain(rainV);
    }
  });

  it("weather set declares weather theme", () => {
    expect(A1_WEATHER_WORDS.learnPhraseTheme).toBe("weather");
  });
});

describe("animals learn phrases", () => {
  it("builds observation and preference variants", () => {
    expect(learnPhraseStatement(word("cat", "cat"), "i_see_a", "s", "animals")).toBe(
      "I see a cat.",
    );
    expect(learnPhraseStatement(word("elephant", "elephant"), "i_see_a", "s", "animals")).toBe(
      "I see an elephant.",
    );
    expect(learnPhraseStatement(word("lion", "lion"), "there_is_a", "s", "animals")).toBe(
      "There is a lion.",
    );
    expect(learnPhraseStatement(word("dog", "dog"), "look_at_the", "s", "animals")).toBe(
      "Look at the dog!",
    );
    expect(learnPhraseStatement(word("dog", "dog"), "i_like", "s", "animals")).toBe(
      "I like dogs.",
    );
    expect(learnPhraseStatement(word("dog", "dog"), "i_dont_like", "s", "animals")).toBe(
      "I don't like dogs.",
    );
  });

  it("never uses mom or breakfast frames for animals theme", () => {
    const dog = word("dog", "dog");
    for (let i = 0; i < 40; i++) {
      const v = pickLearnPhraseVariant(dog, `a-${i}`, "animals");
      expect(["i_like", "i_dont_like", "i_see_a", "there_is_a", "look_at_the"]).toContain(v);
      const text = learnSpeechText(dog, `a-${i}`, "animals");
      expect(text).not.toMatch(/mom doesn't like/i);
      expect(text).not.toMatch(/breakfast/i);
      expect(text).not.toMatch(/wearing/i);
    }
  });

  it("animal sets declare animals theme", () => {
    expect(A1_PETS.learnPhraseTheme).toBe("animals");
    expect(A1_FARM_ANIMALS.learnPhraseTheme).toBe("animals");
  });
});

describe("school learn phrases", () => {
  it("builds supplies and activity variants", () => {
    expect(learnPhraseStatement(word("pencil", "pencil"), "i_have_a", "s", "school_supplies")).toBe(
      "I have a pencil.",
    );
    expect(
      learnPhraseStatement(word("english", "English"), "this_is_my", "s", "school_supplies"),
    ).toBe("This is my English.");
    expect(learnPhraseStatement(word("read", "read"), "i_like_to", "s", "school_activities")).toBe(
      "I like to read.",
    );
    expect(learnPhraseStatement(word("play", "play"), "we_at_school", "s", "school_activities")).toBe(
      "We play at school.",
    );
  });

  it("never uses default breakfast frames for school themes", () => {
    for (let i = 0; i < 30; i++) {
      const supplies = learnSpeechText(word("pen", "pen"), `ss-${i}`, "school_supplies");
      expect(supplies).not.toMatch(/breakfast/i);
      const activities = learnSpeechText(word("draw", "draw"), `sa-${i}`, "school_activities");
      expect(activities).not.toMatch(/wearing/i);
    }
  });

  it("school sets declare school themes", () => {
    expect(A1_SCHOOL_SUPPLIES.learnPhraseTheme).toBe("school_supplies");
    expect(A1_SCHOOL_ACTIVITIES.learnPhraseTheme).toBe("school_activities");
  });

  it("builds school_places frames for phase-2 set", () => {
    expect(learnPhraseStatement(word("classroom", "classroom"), "look_at_the", "s", "school_places")).toBe(
      "Look at the classroom!",
    );
  });
});

describe("body learn phrases", () => {
  it("builds body part variants", () => {
    expect(learnPhraseStatement(word("head", "head"), "this_is_my", "s", "body_head_face")).toBe(
      "This is my head.",
    );
    expect(learnPhraseStatement(word("teeth", "teeth", { grammar: "plural" }), "touch_your", "s", "body_head_face")).toBe(
      "Touch your teeth.",
    );
    expect(learnPhraseStatement(word("leg", "leg"), "i_have_a", "s", "body_limbs_inside")).toBe(
      "I have a leg.",
    );
  });

  it("never uses default breakfast frames for body themes", () => {
    for (let i = 0; i < 20; i++) {
      const text = learnSpeechText(word("hand", "hand"), `b-${i}`, "body_head_face");
      expect(text).not.toMatch(/breakfast/i);
      expect(text).not.toMatch(/wearing/i);
    }
  });

  it("body sets declare body themes", () => {
    expect(A1_BODY_HEAD_FACE.learnPhraseTheme).toBe("body_head_face");
  });
});

describe("jobs learn phrases", () => {
  it("builds job variants with articles", () => {
    expect(learnPhraseStatement(word("doctor", "doctor"), "he_is_a", "s", "jobs_community")).toBe(
      "He is a doctor.",
    );
    expect(learnPhraseStatement(word("nurse", "nurse"), "she_is_a", "s", "jobs_community")).toBe(
      "She is a nurse.",
    );
    expect(
      learnPhraseStatement(word("artist", "artist"), "i_want_to_be", "s", "jobs_creative"),
    ).toBe("I want to be an artist.");
  });

  it("jobs sets declare jobs themes", () => {
    expect(A1_JOBS_COMMUNITY.learnPhraseTheme).toBe("jobs_community");
  });
});

describe("toys learn phrases", () => {
  it("builds toy play and have variants", () => {
    expect(learnPhraseStatement(word("doll", "doll"), "i_play_with", "s", "toys_everyday")).toBe(
      "I play with a doll.",
    );
    expect(learnPhraseStatement(word("blocks", "blocks", { grammar: "plural" }), "i_have_a", "s", "toys_everyday")).toBe(
      "I have blocks.",
    );
  });

  it("toys set declares toys theme", () => {
    expect(A1_TOYS_EVERYDAY.learnPhraseTheme).toBe("toys_everyday");
  });
});
