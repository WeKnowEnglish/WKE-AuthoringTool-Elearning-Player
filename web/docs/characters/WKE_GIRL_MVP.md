# WKE Girl avatar MVP

## Student-facing scope

The live character editor and WKE World use one base avatar:

- Registry ID: `wke_girl_v1`
- Runtime asset: `/characters/wke-girl/wke-girl-base-v1.glb`
- Mesh: `f088de69_1334_475d_9d9a_e94b73a09c04`
- Skeleton root: `mixamorig:Hips`
- Rig contract: full Mixamo-named hierarchy, with 52 deform joints in the skin
- Current hair slot: `wke_girl_hair_original`
- Current outfit slot: `wke_girl_outfit_original`

The old procedural bodies, seed boy, and head-kit prototypes remain available only
to isolated authoring pilots. They are not selectable by students, are not in the
live `CharacterConfig`, and are not rendered by `CharacterModel`.

## What is customizable now

The uploaded model is one skinned mesh using one material and one baked atlas.
The runtime keeps that mesh, skin weights, and skeleton unchanged. The source
GLB has no embedded motion clip, so the existing world `walkingRef` flow drives
small arm/leg swings on its Mixamo bones. A material shader builds soft masks
from the atlas's distinct source
colors and recolors:

- brown pixels: hair
- peach pixels: skin
- purple pixels: the school outfit

White fabric, eyes, seams, and most baked detail remain sourced from the original
texture. This is an MVP palette system, not geometry separation.

The GLB's authored node transforms do not agree with its inverse bind matrices.
`WkeGirlModel` therefore reconstructs the Mixamo rest pose from those matrices
before recording the procedural walking rotations. This keeps the uploaded mesh
intact while preserving a clean cloned skeleton for each rendered instance.

## Persistence and migration

`CharacterConfig` version 2 stores only:

- base ID
- hair slot ID
- outfit slot ID
- skin color
- hair color
- primary outfit color

The normalizer rejects every retired base/part ID. Former saved top and bottom
colors are migrated to the new outfit-color channel so existing students do not
lose their palette entirely.

## Blocker for true mesh swapping

Hair, body, face, clothes, and shoes are fused into the single mesh named above.
There is no separate hair or outfit object to hide or replace. A clean swap
therefore needs an asset-processing pass:

1. Separate hair and clothing geometry in Blender while preserving vertex groups.
2. Repair scalp/body areas that were never modeled under the fused surfaces.
3. Keep the same Mixamo bone names, rest pose, inverse bind matrices, scale, and
   feet-at-origin convention.
4. Export each replacement as a skinned GLB using the `tripo-mixamo-v1` contract.
5. Add a registry row with `source: "glb"`, a public `src`, and the matching
   skeleton contract.
6. Extend `WkeGirlModel` to bind the selected slot mesh to the base skeleton and
   hide the corresponding fused triangles.

The registry and saved slot IDs are already in place, so adding those files will
not require another persistence or editor-state redesign. The unresolved work is
asset separation plus shared-skeleton binding and fused-triangle visibility.
