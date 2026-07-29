import { describe, expect, it } from "vitest";
import {
  buildStudentHomeGreeting,
  dayPartFromHour,
  timeOfDayGreeting,
} from "@/lib/primary/student-home-greeting";

describe("student-home-greeting", () => {
  it("maps hours to day parts", () => {
    expect(dayPartFromHour(8)).toBe("morning");
    expect(dayPartFromHour(14)).toBe("afternoon");
    expect(dayPartFromHour(19)).toBe("evening");
  });

  it("builds time-of-day greetings with a name", () => {
    expect(
      buildStudentHomeGreeting("Mia", { hour: 9, random: 0.1 }),
    ).toBe("Good morning, Mia");
    expect(
      buildStudentHomeGreeting("Mia", { hour: 15, random: 0.1 }),
    ).toBe("Good afternoon, Mia");
    expect(
      buildStudentHomeGreeting("Mia", { hour: 20, random: 0.1 }),
    ).toBe("Good evening, Mia");
  });

  it("sometimes uses a casual greeting", () => {
    expect(
      buildStudentHomeGreeting("Mia", { hour: 9, random: 0.8 }),
    ).toMatch(/^(Hi|Hello|Welcome back), Mia$/);
  });

  it("omits the name when missing", () => {
    expect(buildStudentHomeGreeting(null, { hour: 9, random: 0.1 })).toBe(
      "Good morning",
    );
    expect(timeOfDayGreeting("afternoon")).toBe("Good afternoon");
  });
});
