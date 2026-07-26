# @wke/explore-hotspots-play

Shared **play-mode** rendering for explore-hotspots activities.

Canonical home: `Lesson Player/packages/explore-hotspots-play` (Activity Builder lives in Lesson Player; creator labs stay in EDU Studio).

## Owns
- `contoursToSvgPath` — segmentation contours → SVG path
- `ExploreHotspotsMediaPlay` — image stage with spotlight mask, outline, and glow
- Shared hotspot / highlight types used by Studio preview and Lesson Player

## Does not own
- SAM / object detection (Studio only)
- Authoring canvas tools (Studio `HotspotMediaCanvas` author mode)
- Lesson navigation / TTS / rewards (Lesson Player)

## Consumers
- `Lesson Player/web` via `file:../packages/explore-hotspots-play`
- `svg-edu-studio` via `file:../../Lesson Player/packages/explore-hotspots-play`

Both apps should list `@wke/explore-hotspots-play` in `transpilePackages` and alias it in Turbopack/webpack (see each app’s `next.config.ts`).
