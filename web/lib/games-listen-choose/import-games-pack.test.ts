import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import bakeryListenChoose from "@/content/pilots/games-listen-choose/bakery-listen-choose.json";
import {
  importGamesListenAndChoosePack,
  revokeImportedObjectUrls,
} from "./import-games-pack";

/** Tiny 1x1 PNG. */
const TINY_PNG_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

describe("importGamesListenAndChoosePack", () => {
  it("imports JSON packs", async () => {
    const file = new File(
      [JSON.stringify(bakeryListenChoose)],
      "bakery.games-listen.lessonplayer.json",
      { type: "application/json" },
    );
    const imported = await importGamesListenAndChoosePack(file);
    expect(imported.mode).toBe("json");
    expect(imported.pack.screens).toHaveLength(2);
    expect(imported.objectUrls).toHaveLength(0);
  });

  it("imports zip packs and remaps assets to blob URLs", async () => {
    const pack = {
      version: 1,
      kind: "lessonplayer-games-pack",
      format: "listen_and_choose",
      quiz_group_id: "zip-demo",
      quiz_group_title: "Zip demo",
      activity_name: "Zip demo",
      screens: [
        {
          type: "interaction",
          subtype: "listen_and_choose",
          body_text: "Listen, then choose the picture.",
          dialog_text: "Hello!",
          image_fit: "contain",
          auto_play: false,
          shuffle_choices: false,
          choices: [
            {
              id: "a",
              image_url: "/pilots/games-listen-choose/imports/q1-a.png",
              label: "A",
            },
            {
              id: "b",
              image_url: "/pilots/games-listen-choose/imports/q1-b.png",
              label: "B",
            },
            {
              id: "c",
              image_url: "/pilots/games-listen-choose/imports/q1-c.png",
              label: "C",
            },
          ],
          correct_choice_id: "a",
          prompt_audio_url: "/pilots/games-listen-choose/imports/q1-dialog.webm",
          quiz_group_id: "zip-demo",
          quiz_group_title: "Zip demo",
          quiz_group_order: 0,
        },
      ],
    };

    const zip = new JSZip();
    zip.file(
      "zip-demo.games-listen.lessonplayer.json",
      `${JSON.stringify(pack, null, 2)}\n`,
    );
    zip.file("assets/q1-a.png", TINY_PNG_BYTES);
    zip.file("assets/q1-b.png", TINY_PNG_BYTES);
    zip.file("assets/q1-c.png", TINY_PNG_BYTES);
    zip.file("assets/q1-dialog.webm", new Uint8Array([1, 2, 3, 4]));

    const blob = await zip.generateAsync({ type: "blob" });
    const file = new File([blob], "zip-demo.games-listen.lessonplayer.zip", {
      type: "application/zip",
    });

    const imported = await importGamesListenAndChoosePack(file);
    expect(imported.mode).toBe("zip");
    expect(imported.pack.screens).toHaveLength(1);
    expect(imported.objectUrls.length).toBeGreaterThanOrEqual(4);
    expect(imported.pack.screens[0]?.choices[0]?.image_url.startsWith("blob:")).toBe(true);
    expect(imported.pack.screens[0]?.prompt_audio_url?.startsWith("blob:")).toBe(true);

    revokeImportedObjectUrls(imported.objectUrls);
  });

  it("keeps https cloud URLs in hybrid zip packs (not in assets/)", async () => {
    const cloud =
      "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/studio_media/u/a/pic.webp";
    const pack = {
      version: 1,
      kind: "lessonplayer-games-pack",
      format: "listen_and_choose",
      quiz_group_id: "hybrid",
      quiz_group_title: "Hybrid",
      activity_name: "Hybrid",
      screens: [
        {
          type: "interaction",
          subtype: "listen_and_choose",
          body_text: "Listen, then choose the picture.",
          dialog_text: "Hello!",
          image_fit: "contain",
          auto_play: false,
          shuffle_choices: false,
          choices: [
            { id: "a", image_url: cloud, label: "A" },
            {
              id: "b",
              image_url: "/pilots/games-listen-choose/imports/q1-b.png",
              label: "B",
            },
            {
              id: "c",
              image_url: "assets/q1-c.png",
              label: "C",
            },
          ],
          correct_choice_id: "a",
          prompt_audio_url: cloud.replace("pic.webp", "clip.webm"),
          quiz_group_id: "hybrid",
          quiz_group_title: "Hybrid",
          quiz_group_order: 0,
        },
      ],
    };

    const zip = new JSZip();
    zip.file("hybrid.games-listen.lessonplayer.json", `${JSON.stringify(pack)}\n`);
    zip.file("assets/q1-b.png", TINY_PNG_BYTES);
    zip.file("assets/q1-c.png", TINY_PNG_BYTES);

    const blob = await zip.generateAsync({ type: "blob" });
    const file = new File([blob], "hybrid.games-listen.lessonplayer.zip", {
      type: "application/zip",
    });

    const imported = await importGamesListenAndChoosePack(file);
    expect(imported.pack.screens[0]?.choices[0]?.image_url).toBe(cloud);
    expect(imported.pack.screens[0]?.prompt_audio_url).toBe(
      cloud.replace("pic.webp", "clip.webm"),
    );
    expect(imported.pack.screens[0]?.choices[1]?.image_url.startsWith("blob:")).toBe(true);
    expect(imported.pack.screens[0]?.choices[2]?.image_url.startsWith("blob:")).toBe(true);
    revokeImportedObjectUrls(imported.objectUrls);
  });
});
