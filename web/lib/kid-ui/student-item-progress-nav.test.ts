import { describe, expect, it } from "vitest";
import { studentItemProgressBubbleClass } from "@/components/kid-ui/StudentItemProgressNav";

describe("studentItemProgressBubbleClass", () => {
  it("marks incorrect bubbles amber (current elongated, others small)", () => {
    const currentWrong = studentItemProgressBubbleClass({
      current: true,
      filled: true,
      result: "incorrect",
    });
    const otherWrong = studentItemProgressBubbleClass({
      current: false,
      filled: true,
      result: "incorrect",
    });
    expect(currentWrong).toContain("bg-amber-500");
    expect(currentWrong).toContain("w-8");
    expect(otherWrong).toContain("bg-amber-400");
    expect(otherWrong).not.toContain("w-8");
  });

  it("keeps correct and unanswered distinct from incorrect", () => {
    const correct = studentItemProgressBubbleClass({
      current: false,
      filled: true,
      result: "correct",
    });
    const idle = studentItemProgressBubbleClass({
      current: false,
      filled: false,
      result: "none",
    });
    expect(correct).toContain("bg-emerald-500");
    expect(idle).toContain("bg-slate-300");
  });
});
