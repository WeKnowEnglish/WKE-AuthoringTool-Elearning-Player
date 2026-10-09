import { describe, expect, it } from "vitest";
import { canEditDocumentWork } from "./edit-permissions";

const shared = { participationMode: "whole_class", phase: "active", workStatus: "active",
  role: "host" as const, isOwner: false, hasReviewPush: false };

describe("teacher and student shared writing", () => {
  it("lets the teacher co-write the whole-class document", () => {
    expect(canEditDocumentWork(shared)).toBe(true);
    expect(canEditDocumentWork({ ...shared, role: "player", isOwner: true })).toBe(true);
  });
  it.each(["individual", "group"])("keeps teacher inspection read-only for %s work", participationMode => {
    expect(canEditDocumentWork({ ...shared, participationMode })).toBe(false);
  });
  it.each(["waiting", "collected", "review", "completed", "ended"])("locks teacher writing during %s", phase => {
    expect(canEditDocumentWork({ ...shared, phase })).toBe(false);
  });
  it("locks the document during pushed review or after collection", () => {
    expect(canEditDocumentWork({ ...shared, hasReviewPush: true })).toBe(false);
    expect(canEditDocumentWork({ ...shared, workStatus: "auto_submitted" })).toBe(false);
  });
  it("allows the teacher to help revise returned class writing", () => {
    expect(canEditDocumentWork({ ...shared, phase: "revision", workStatus: "revising" })).toBe(true);
  });
  it("keeps other students' private work read-only", () => {
    expect(canEditDocumentWork({ ...shared, role: "player", participationMode: "individual" })).toBe(false);
  });
});
