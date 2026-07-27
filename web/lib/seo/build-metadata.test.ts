import { describe, expect, it } from "vitest";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";

describe("buildPublicMetadata", () => {
  it("builds a self-referencing canonical without a trailing slash", () => {
    const metadata = buildPublicMetadata({
      title: "Online ESL Activities for Kids",
      description: "Find interactive ESL activities.",
      pathname: "/esl-activities-for-kids",
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://weknowenglish.online/esl-activities-for-kids",
    );
    expect(metadata.title).toBe("Online ESL Activities for Kids");
  });

  it("supports absolute titles that ignore the root template", () => {
    const metadata = buildPublicMetadata({
      title: "We Know English | Custom",
      description: "Custom",
      pathname: "/",
      absoluteTitle: true,
    });

    expect(metadata.title).toEqual({ absolute: "We Know English | Custom" });
    expect(metadata.alternates?.canonical).toBe("https://weknowenglish.online");
  });
});
