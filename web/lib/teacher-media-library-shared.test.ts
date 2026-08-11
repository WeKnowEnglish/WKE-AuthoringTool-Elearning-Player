import { describe, expect, it } from "vitest";
import {
  assetDisplayKind,
  folderDefsForPicker,
} from "@/components/teacher/media/teacherMediaLibraryShared";

describe("teacher media library document support", () => {
  it("shows only PDF shelves for a document picker", () => {
    expect(folderDefsForPicker(null, "document")).toEqual([
      {
        id: "school_documents",
        label: "School PDFs",
        kind: "document",
        scope: "school",
      },
      {
        id: "my_uploads",
        label: "My PDFs",
        kind: "document",
        scope: "mine",
      },
    ]);
  });

  it("recognizes PDF assets independently of the picker fallback", () => {
    expect(assetDisplayKind("application/pdf", "image")).toBe("document");
  });
});
