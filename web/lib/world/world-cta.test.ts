import { describe, expect, it } from "vitest";
import { worldCta } from "@/components/world/world-cta";
import type { WorldSelection } from "@/components/world/world-landmasses";

function selection(overrides: Partial<WorldSelection>): WorldSelection {
  return {
    landmassId: "home",
    zone: "home",
    label: "Home Island",
    locked: false,
    href: "/primary",
    ctaLabel: "Go to class",
    blurb: "Start here.",
    journeyOrder: 1,
    ...overrides,
  };
}

describe("worldCta", () => {
  it("sends signed-in students to the hub path", () => {
    expect(worldCta(selection({ href: "/primary?nav=learn", ctaLabel: "Read stories" }), true)).toEqual({
      href: "/primary?nav=learn",
      label: "Read stories",
      disabled: false,
    });
  });

  it("sends signed-out students through Primary login with next", () => {
    expect(worldCta(selection({ href: "/primary?nav=games", ctaLabel: "Play games" }), false)).toEqual({
      href: "/primary/login?next=%2Fprimary%3Fnav%3Dgames",
      label: "Sign in to play",
      disabled: false,
    });
  });

  it("sends the home pet yard to Primary Games", () => {
    expect(
      worldCta(
        selection({
          spot: "pet",
          label: "Pet yard",
          href: "/primary?nav=games",
          ctaLabel: "See your pet",
        }),
        true,
      ),
    ).toEqual({
      href: "/primary?nav=games",
      label: "See your pet",
      disabled: false,
    });
  });

  it("sends house and school to the walkable play space", () => {
    expect(
      worldCta(
        selection({
          spot: "school",
          href: "/primary/world/play/school",
          ctaLabel: "Walk around",
        }),
        true,
      ),
    ).toEqual({
      href: "/primary/world/play/school",
      label: "Walk around",
      disabled: false,
    });
  });

  it("marks locked islands as coming soon", () => {
    expect(worldCta(selection({ locked: true, href: null, ctaLabel: null }), true)).toEqual({
      href: null,
      label: "Coming soon",
      disabled: true,
    });
  });
});
