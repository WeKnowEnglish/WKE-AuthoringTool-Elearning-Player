# Editable Comic Format v1

This is the working format for WKE comics in the lesson player. It keeps visual art, lettering, learning supports, and application behavior separate so that each can be revised without rebuilding the others.

## Package structure

Each page has two primary layers:

1. **Clean art master** — the panel artwork without speech bubbles, captions, titles, panel numbers, or sound-effect lettering.
2. **Overlay JSON** — editable lettering and learning metadata placed with percentage-based coordinates.

Chapters 1 and 2 are the reference implementations:

- Art: `web/public/comics/chapter-1/art/`
- Overlays: `web/content/comics/chapter-1/overlays/`
- Bundled chapter manifest: `web/content/comics/chapter-1/index.ts`
- Chapter 2 art: `web/public/comics/chapter-2/art/`
- Chapter 2 overlays: `web/content/comics/chapter-2/overlays/`
- Chapter 2 bundled manifest: `web/content/comics/chapter-2/index.ts`
- Validation schema: `web/lib/comic/overlay.ts`

The original flattened pages remain in `web/docs/comic-production/source-pages/chapter-01/` as recovery and comparison references.

## Overlay fields

Every overlay records:

- the art canvas width and height;
- accessible page description;
- editable text elements;
- optional character introductions;
- vocabulary definitions and examples;
- a discussion prompt.

Each text element records its kind, text, normalized position and size, optional speaker, balloon-tail position, reading order, type scale, linked vocabulary, and vocal emphasis. Coordinates use a 0–100 scale, so the page remains responsive at different screen sizes.

Supported element kinds are speech, thought, narration, caption, sound effect, panel number, title, and subtitle.

## Teacher editing workflow

1. Open **Teacher → Media → Comics**.
2. Choose Chapter 1 or Chapter 2 and install its bundled editable package if the database does not yet contain the clean layered version.
3. Select the pencil on a page.
4. Drag an element to reposition it, or edit exact percentage values.
5. Revise the text, speaker, kind, reading order, scale, or discussion prompt.
6. Save to publish the revised overlay, or download the JSON as a portable source file.

The installer changes database references to the new clean masters but leaves the old storage objects untouched for recovery.

## Student interaction rules

- Artwork and lettering render as separate layers. On page entry, titles, captions, panel numbers, sound effects, and dialogue pop in with a short stagger based on reading order.
- Tapping a dialogue bubble gives it a brief visual bounce and focus ring; no voice or audio is enabled in production v1.
- **Replay bubbles** restarts the page’s lettering sequence.
- **Art only** hides the complete lettering layer so learners can inspect the visual story or make a prediction before revealing the text again.
- Vocabulary chips give a learner-friendly definition and example.
- **Think and talk** provides an age-appropriate prediction, inference, or safety prompt.
- The cover may include a **Meet the friends** card so learners can connect names, clothing colors, and personalities before reading.
- Arrow keys, page keys, thumbnails, buttons, and swipe navigation are supported.
- The page fits mixed source aspect ratios without cropping or horizontal overflow.

## Production rules

- Treat the clean art and overlay JSON as the editable masters. Do not flatten text back into the art for the web reader.
- Preserve a flattened export only when required for print or an external platform.
- Give every spoken line one canonical speaker and a unique reading-order number on its page.
- Keep balloons clear of faces, hands, important props, and panel transitions.
- Keep the language within the chapter’s CEFR plan; define only words worth deliberate attention.
- Add one purposeful student prompt per page. Prompts should support prediction, retelling, inference, opinion, language practice, or safety reflection.
- Validate overlay bounds and reading order before release.

## Recommended v2 extensions

- Sentence recording with learner playback and optional teacher review.
- Tap-to-translate support controlled by the teacher or learner profile.
- Panel-by-panel reveal for guided reading.
- Choice points that ask learners to predict before showing the next panel.
- Lightweight comprehension checks after selected pages.
- Optional per-line audio files for consistent character voices. Add this only after voice casting, recording standards, and playback behavior are approved; do not rely on provisional browser speech in production.
- Reading analytics limited to meaningful learning events: pages completed, words explored, listening attempts, and checks answered.
- Export tooling that creates print-ready flattened pages from the same art and overlay sources.
