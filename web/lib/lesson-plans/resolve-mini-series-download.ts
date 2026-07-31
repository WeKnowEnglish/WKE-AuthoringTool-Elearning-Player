import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import {
  findLessonBySlug,
  findPackBySlug,
  listAllLessons,
  parseMiniSeriesResourceId,
  type MiniSeriesResourceRef,
} from "@/lib/lesson-plans/mini-series-manifest";

const PACKS_ROOT = path.join(
  process.cwd(),
  "content",
  "lesson-plans",
  "mini-series",
  "packs",
);

function lessonAbsolutePath(packSlug: string, filename: string): string {
  return path.join(PACKS_ROOT, packSlug, filename);
}

async function readLessonFile(packSlug: string, filename: string): Promise<Buffer> {
  const absolute = lessonAbsolutePath(packSlug, filename);
  const resolvedRoot = path.resolve(PACKS_ROOT);
  if (!path.resolve(absolute).startsWith(resolvedRoot)) {
    throw new Error("Invalid lesson path.");
  }
  return readFile(absolute);
}

export type ResolvedMiniSeriesDownload = {
  filename: string;
  contentType: string;
  body: Buffer;
};

export async function resolveMiniSeriesDownload(
  resourceId: string,
): Promise<ResolvedMiniSeriesDownload | null> {
  const ref = parseMiniSeriesResourceId(resourceId);
  if (!ref) return null;
  return buildDownload(ref);
}

async function buildDownload(ref: MiniSeriesResourceRef): Promise<ResolvedMiniSeriesDownload | null> {
  if (ref.kind === "lesson") {
    const found = findLessonBySlug(ref.lessonSlug);
    if (!found) return null;
    const body = await readLessonFile(found.pack.slug, found.lesson.filename);
    return {
      filename: found.lesson.filename,
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      body,
    };
  }

  const zip = new JSZip();
  const entries =
    ref.kind === "pack"
      ? (() => {
          const pack = findPackBySlug(ref.packSlug);
          if (!pack) return null;
          return pack.lessons.map((lesson) => ({
            packSlug: pack.slug,
            lesson,
          }));
        })()
      : listAllLessons().map(({ pack, lesson }) => ({ packSlug: pack.slug, lesson }));

  if (!entries?.length) return null;

  for (const { packSlug, lesson } of entries) {
    const body = await readLessonFile(packSlug, lesson.filename);
    zip.file(lesson.filename, body);
  }

  const body = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const filename =
    ref.kind === "pack"
      ? `wke-mini-series-${ref.packSlug}.zip`
      : "wke-esl-mini-series-library.zip";

  return {
    filename,
    contentType: "application/zip",
    body,
  };
}
