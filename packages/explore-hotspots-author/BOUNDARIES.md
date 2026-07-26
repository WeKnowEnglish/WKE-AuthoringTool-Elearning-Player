# Explore Hotspots — package boundaries

## `@wke/explore-hotspots-play` (student + preview)

Owns runtime play:

- `ExploreHotspotsMediaPlay` media stage
- `contoursToSvgPath`, highlight defaults
- Hit testing for play (**geometry-first**)
- Shared geometry / visualShape types used at runtime

Must stay free of SAM / transformers / model loaders.

## `@wke/explore-hotspots-author` (teacher algorithms)

Owns pure authoring algorithms:

- Auto seed generation + foreground seed filtering
- Mask postprocess (hole fill options, exclude carve)

**Never** import this package from student lesson routes or play-only bundles.

## Lesson Player teacher modules (canonical authoring)

- SlimSAM session (`web/lib/hotspots/sam/*`) — teacher Activity Builder only
- `detectActivityHotspotContour`, `maskContours`
- `ExploreHotspotsWorkspace` + `HotspotMediaCanvas`
- Route: `/teacher/activity-builder/hotspots`
- Bank format: `explore_hotspots` (`.wkeactivity` authoring + LP payload pack)

## Learning Track Compiler

- Hotspot beats: fixture **or** `source: { type: "library", format: "explore_hotspots", libraryId }`
- Resolve loads Activity Bank pack and applies LTC panel overlays

## EDU Studio (Phase 4 retired)

- `/activity-builder/hotspots` is a handoff page to Lesson Player (`HotspotsMovedPanel`)
- Legacy `HotspotActivityWorkspace` is deprecated / unused
- Sprite-sheet SAM (`spriteSheetSamDetect`, AMG) stays Studio-only for sprite tools

## Contract between layers

| Field | Authoring | Play |
| --- | --- | --- |
| `geometry` | Drawn hit target (forgiving) | **Primary hit test** |
| `visualShape.paths` | SAM contour (evenodd display) | Spotlight / outline only |
| SAM model | Teacher Activity Builder only | Never |
