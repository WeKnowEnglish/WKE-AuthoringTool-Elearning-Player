import { describe, expect, it } from "vitest";
import {
  isStudentLoginPath,
  resolveStudentDoorBand,
  studentLoginPath,
} from "@/lib/auth/student-login";

describe("studentLoginPath", () => {
  it("sends Primary students to the dedicated Primary login door", () => {
    expect(studentLoginPath("a1")).toBe("/primary/login");
  });

  it("sends Secondary students to the dedicated Secondary login door", () => {
    expect(studentLoginPath("a2")).toBe("/secondary/login");
  });

  it("preserves a safe post-login next path", () => {
    expect(studentLoginPath("a1", "/primary/homework/abc")).toBe(
      "/primary/login?next=%2Fprimary%2Fhomework%2Fabc",
    );
  });

  it("drops login doors used as next paths", () => {
    expect(studentLoginPath("a1", "/primary/login")).toBe("/primary/login");
  });
});

describe("resolveStudentDoorBand", () => {
  it("uses an explicit Primary or Secondary band query", () => {
    expect(resolveStudentDoorBand({ bandParam: "a1" })).toBe("a1");
    expect(resolveStudentDoorBand({ bandParam: "a2" })).toBe("a2");
  });

  it("does not treat legacy B1 as a public signup door", () => {
    expect(resolveStudentDoorBand({ bandParam: "b1" })).toBeNull();
  });

  it("infers Primary from /primary next paths, including the old students doorway", () => {
    expect(resolveStudentDoorBand({ nextPath: "/primary" })).toBe("a1");
    expect(
      resolveStudentDoorBand({ nextPath: "/primary/homework/abc" }),
    ).toBe("a1");
  });

  it("infers Secondary from /secondary next paths", () => {
    expect(resolveStudentDoorBand({ nextPath: "/secondary" })).toBe("a2");
  });

  it("does not guess a band for join-class or empty next paths", () => {
    expect(resolveStudentDoorBand({ nextPath: "/join-class" })).toBeNull();
    expect(resolveStudentDoorBand({})).toBeNull();
  });
});

describe("isStudentLoginPath", () => {
  it("recognizes both student login doors", () => {
    expect(isStudentLoginPath("/primary/login")).toBe(true);
    expect(isStudentLoginPath("/secondary/login?next=%2Fsecondary")).toBe(true);
    expect(isStudentLoginPath("/login")).toBe(false);
  });
});
