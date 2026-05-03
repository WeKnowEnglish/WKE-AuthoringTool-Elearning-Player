import { describe, expect, it, vi } from "vitest";
import {
  applyMediaBindingsToPayload,
  assertBindingsMatchScreenType,
  collectMediaBindingAssetIds,
  fetchMediaPublicUrlsByIds,
  fillUnmappedStoryPageBackgrounds,
  gatherAllBindingUuids,
} from "@/lib/lesson-import-media";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

describe("collectMediaBindingAssetIds", () => {
  it("returns empty for null/undefined", () => {
    expect(collectMediaBindingAssetIds(undefined)).toEqual([]);
    expect(collectMediaBindingAssetIds(null)).toEqual([]);
  });

  it("parses nested story bindings", () => {
    const raw = {
      "0": {
        root: { image_url: UUID_A },
        pages: { page_x: { background_image_url: UUID_B } },
        items: { hero: UUID_A },
      },
    };
    const rows = collectMediaBindingAssetIds(raw);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.screenIndex).toBe(0);
    expect(rows[0]!.bindings.root?.image_url).toBe(UUID_A);
    expect(rows[0]!.bindings.pages?.page_x?.background_image_url).toBe(UUID_B);
    expect(rows[0]!.bindings.items?.hero).toBe(UUID_A);
  });

  it("parses cast bindings", () => {
    const raw = {
      "0": {
        cast: { hero: UUID_B },
      },
    };
    const rows = collectMediaBindingAssetIds(raw);
    expect(rows[0]!.bindings.cast?.hero).toBe(UUID_B);
  });

  it("rejects invalid UUID", () => {
    expect(() =>
      collectMediaBindingAssetIds({
        "0": { root: { image_url: "not-a-uuid" } },
      }),
    ).toThrow(/must be a media_assets UUID/);
  });

  it("rejects non-numeric screen key", () => {
    expect(() =>
      collectMediaBindingAssetIds({
        abc: { root: { image_url: UUID_A } },
      }),
    ).toThrow(/invalid screen key/);
  });
});

describe("gatherAllBindingUuids", () => {
  it("dedupes ids", () => {
    const structured = collectMediaBindingAssetIds({
      "0": { root: { image_url: UUID_A }, items: { a: UUID_A, b: UUID_B } },
    });
    const ids = gatherAllBindingUuids(structured);
    expect(ids.sort()).toEqual([UUID_A, UUID_B].sort());
  });
});

describe("assertBindingsMatchScreenType", () => {
  it("allows story with pages/items", () => {
    expect(() =>
      assertBindingsMatchScreenType(
        "story",
        { pages: { p: { background_image_url: UUID_A } }, items: { i: UUID_B } },
        0,
      ),
    ).not.toThrow();
  });

  it("rejects pages on start screen", () => {
    expect(() =>
      assertBindingsMatchScreenType("start", { pages: { p: { background_image_url: UUID_A } } }, 2),
    ).toThrow(/only valid when.*story/);
  });

  it("rejects cast on start screen", () => {
    expect(() =>
      assertBindingsMatchScreenType("start", { cast: { c1: UUID_A } }, 1),
    ).toThrow(/"cast" is only valid when/);
  });
});

describe("applyMediaBindingsToPayload", () => {
  const urlById = new Map<string, string>([
    [UUID_A, "https://cdn.example/a.png"],
    [UUID_B, "https://cdn.example/b.png"],
  ]);

  it("sets start image_url", () => {
    const payload: Record<string, unknown> = {};
    applyMediaBindingsToPayload(
      "start",
      payload,
      { root: { image_url: UUID_A } },
      urlById,
    );
    expect(payload.image_url).toBe("https://cdn.example/a.png");
  });

  it("sets interaction image_url", () => {
    const payload: Record<string, unknown> = {};
    applyMediaBindingsToPayload(
      "interaction",
      payload,
      { root: { image_url: UUID_B } },
      urlById,
    );
    expect(payload.image_url).toBe("https://cdn.example/b.png");
  });

  it("sets story root, page background, and item image_url", () => {
    const payload: Record<string, unknown> = {
      pages: [
        {
          id: "pg1",
          items: [
            { id: "rock", kind: "image", image_url: "https://old/rock.png" },
            { id: "cap", kind: "text", text: "Hi" },
          ],
        },
      ],
    };
    applyMediaBindingsToPayload(
      "story",
      payload,
      {
        root: { image_url: UUID_A },
        pages: { pg1: { background_image_url: UUID_B } },
        items: { rock: UUID_A },
      },
      urlById,
    );
    expect(payload.image_url).toBe("https://cdn.example/a.png");
    const pg = (payload.pages as Record<string, unknown>[])[0]!;
    expect(pg.background_image_url).toBe("https://cdn.example/b.png");
    const rock = (pg.items as Record<string, unknown>[])[0]!;
    expect(rock.image_url).toBe("https://cdn.example/a.png");
    const cap = (pg.items as Record<string, unknown>[])[1]!;
    expect(cap.image_url).toBeUndefined();
  });

  it("throws if story page id missing", () => {
    const payload: Record<string, unknown> = { pages: [{ id: "only", items: [] }] };
    expect(() =>
      applyMediaBindingsToPayload(
        "story",
        payload,
        { pages: { missing: { background_image_url: UUID_A } } },
        urlById,
      ),
    ).toThrow(/page id "missing" not found/);
  });

  it("throws if binding image onto non-image item", () => {
    const payload: Record<string, unknown> = {
      pages: [{ id: "p", items: [{ id: "t", kind: "text", text: "x" }] }],
    };
    expect(() =>
      applyMediaBindingsToPayload("story", payload, { items: { t: UUID_A } }, urlById),
    ).toThrow(/image bindings apply only to image items/);
  });

  it("throws if item id in bindings never appears on any page", () => {
    const payload: Record<string, unknown> = {
      pages: [{ id: "p", items: [{ id: "rock", kind: "image", image_url: "https://old/x.png" }] }],
    };
    expect(() =>
      applyMediaBindingsToPayload(
        "story",
        payload,
        { items: { rock: UUID_A, ghost: UUID_B } },
        urlById,
      ),
    ).toThrow(/story item id "ghost"/);
  });

  it("sets cast entry image_url from bindings", () => {
    const payload: Record<string, unknown> = {
      pages: [{ id: "p1", items: [] }],
      cast: [{ id: "c1", role: "character", image_url: "https://old.png" }],
    };
    applyMediaBindingsToPayload(
      "story",
      payload,
      { cast: { c1: UUID_A } },
      urlById,
    );
    const row = (payload.cast as Record<string, unknown>[])[0]!;
    expect(row.image_url).toBe("https://cdn.example/a.png");
  });

  it("throws if cast id in bindings missing from payload.cast", () => {
    const payload: Record<string, unknown> = {
      pages: [{ id: "p1", items: [] }],
      cast: [{ id: "c1", role: "character", image_url: "https://old.png" }],
    };
    expect(() =>
      applyMediaBindingsToPayload("story", payload, { cast: { ghost: UUID_A } }, urlById),
    ).toThrow(/cast id "ghost"/);
  });
});

describe("fillUnmappedStoryPageBackgrounds", () => {
  it("replaces placeholder backgrounds when page has no background binding", async () => {
    const payload: Record<string, unknown> = {
      pages: [
        {
          id: "magic_p1_outside",
          background_image_url: "https://placehold.co/1600x1000/1e293b/94a3b8?text=Spooky",
        },
        {
          id: "magic_p2_inside",
          background_image_url: "https://placehold.co/1600x1000/eee/000?text=Hall",
        },
      ],
    };
    const chain = {
      select: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { public_url: "https://cdn.example/library-bg.png" },
        error: null,
      }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) };
    await fillUnmappedStoryPageBackgrounds(
      supabase as never,
      payload,
      {
        pages: {
          magic_p2_inside: { background_image_url: UUID_A },
        },
      },
    );
    const pages = payload.pages as { id: string; background_image_url?: string }[];
    expect(pages[0].background_image_url).toBe("https://cdn.example/library-bg.png");
    expect(pages[1].background_image_url).toBe("https://placehold.co/1600x1000/eee/000?text=Hall");
  });
});

describe("fetchMediaPublicUrlsByIds", () => {
  it("throws when an id is missing from results", async () => {
    const supabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: UUID_A, public_url: "https://x/a.png" }],
        error: null,
      }),
    };
    await expect(
      fetchMediaPublicUrlsByIds(supabase as never, [UUID_A, UUID_B]),
    ).rejects.toThrow(/unknown or inaccessible media_assets/);
  });

  it("returns map when all ids exist", async () => {
    const supabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: UUID_A, public_url: "https://x/a.png" },
          { id: UUID_B, public_url: "https://x/b.png" },
        ],
        error: null,
      }),
    };
    const m = await fetchMediaPublicUrlsByIds(supabase as never, [UUID_A, UUID_B]);
    expect(m.get(UUID_A)).toBe("https://x/a.png");
    expect(m.get(UUID_B)).toBe("https://x/b.png");
  });
});
