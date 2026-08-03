import coverOverlayJson from "@/content/comics/chapter-1/overlays/cover.overlay.json";
import page01OverlayJson from "@/content/comics/chapter-1/overlays/page-01.overlay.json";
import page02OverlayJson from "@/content/comics/chapter-1/overlays/page-02.overlay.json";
import page03OverlayJson from "@/content/comics/chapter-1/overlays/page-03.overlay.json";
import page04OverlayJson from "@/content/comics/chapter-1/overlays/page-04.overlay.json";
import page05OverlayJson from "@/content/comics/chapter-1/overlays/page-05.overlay.json";
import page06OverlayJson from "@/content/comics/chapter-1/overlays/page-06.overlay.json";
import { parseComicPageOverlay, type ComicPageOverlay } from "@/lib/comic/overlay";
import type { ComicChapterWithPages, ComicPage } from "@/lib/comic/types";

type BundledPageInput = {
  slug: string;
  publicUrl: string;
  overlayJson: unknown;
};

const bundledPages: BundledPageInput[] = [
  {
    slug: "cover",
    publicUrl: "/comics/chapter-1/art/cover-art-v1.png",
    overlayJson: coverOverlayJson,
  },
  {
    slug: "page-01",
    publicUrl: "/comics/chapter-1/art/page-01-art-v2.png",
    overlayJson: page01OverlayJson,
  },
  {
    slug: "page-02",
    publicUrl: "/comics/chapter-1/art/page-02-art-v1.png",
    overlayJson: page02OverlayJson,
  },
  {
    slug: "page-03",
    publicUrl: "/comics/chapter-1/art/page-03-art-v1.png",
    overlayJson: page03OverlayJson,
  },
  {
    slug: "page-04",
    publicUrl: "/comics/chapter-1/art/page-04-art-v2.png",
    overlayJson: page04OverlayJson,
  },
  {
    slug: "page-05",
    publicUrl: "/comics/chapter-1/art/page-05-art-v1.png",
    overlayJson: page05OverlayJson,
  },
  {
    slug: "page-06",
    publicUrl: "/comics/chapter-1/art/page-06-art-v1.png",
    overlayJson: page06OverlayJson,
  },
];

function requireOverlay(value: unknown, slug: string): ComicPageOverlay {
  const overlay = parseComicPageOverlay(value);
  if (!overlay) throw new Error(`Invalid bundled comic overlay: ${slug}`);
  return overlay;
}

const pages: ComicPage[] = bundledPages.map((page, index) => {
  const overlay = requireOverlay(page.overlayJson, page.slug);
  return {
    id: `bundled-chapter-1-${page.slug}`,
    chapterId: "bundled-chapter-1",
    pageIndex: index + 1,
    publicUrl: page.publicUrl,
    originalFilename: page.publicUrl.split("/").pop() ?? `${page.slug}.png`,
    contentType: "image/png",
    imageWidth: overlay.canvas.width,
    imageHeight: overlay.canvas.height,
    overlay,
  };
});

export const chapterOneEditablePackage: ComicChapterWithPages = {
  id: "bundled-chapter-1",
  slug: "chapter-1",
  title: "A New Friend Arrives",
  subtitle: "Chapter 1 · Curiosity, courage, friendship, adventure",
  published: true,
  source: "bundled",
  pages,
};
