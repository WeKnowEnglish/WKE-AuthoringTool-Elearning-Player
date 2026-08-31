# Guided Dialogue Phase — Product and Interaction Specification

## Purpose

The **Guided Dialogue Phase** is a reusable lesson-player primitive in which a foreground character speaks directly with the learner while controlling attention within a background learning scene.

It should feel closer to a gentle role-playing game conversation than a narrated slide:

- the guide is visually close to the learner;
- the learner is addressed as a participant;
- the character can reposition and turn toward the current object of attention;
- the background can dim while one region or object remains highlighted;
- dialogue can lead into a choice, tap, spoken response, or another learning activity;
- progress occurs through meaningful turns rather than a passive autoplay sequence.

The first use is the Unit 1 Welcome Fair, but the primitive must remain content-neutral and reusable across the full curriculum.

---

## 1. Experience principles

### The character is a guide, not a presenter

The guide should establish purpose, direct attention, model curiosity and communication, ask the learner to act or respond, react briefly, and withdraw visually when the learner needs to focus or perform.

The guide should not speak continuously, explain every visible detail, or praise every tap.

### Visually close, not visually obstructive

For close dialogue turns, the character may be taller than the stage—typically **110–145% of stage height**—with feet or lower body intentionally cropped below the viewport. This creates conversational proximity.

The close character must occupy the side opposite the active learning target. When no target is active, the character may use a lower corner or centered conversational composition.

### Motion communicates intention

Movement should clarify who is speaking, what to look at, whether the guide is addressing the learner or looking at the scene, whose turn it is, or whether the story is moving forward. If movement communicates none of these, it should be removed.

---

## 2. Visual staging model

The scene is divided into four layers:

1. **Background scene** — the full learning environment.
2. **Focus treatment** — dim overlay and one or more cut-out spotlight masks.
3. **Scene targets** — optional highlight contours, glows, or interaction zones.
4. **Dialogue foreground** — guide character, dialogue card, response controls, and captions.

### Character anchors

| Anchor | Typical use | Recommended character box |
|---|---|---|
| `close_left` | Target lies in center or right | x −8% to 22%; height 115–145% |
| `close_right` | Target lies in center or left | x 70% to 102%; height 115–145% |
| `lower_left` | Learner studies broad scene | x 1% to 19%; height 55–80% |
| `lower_right` | Learner studies broad scene | x 81% to 99%; height 55–80% |
| `center_close` | Personal question or emotional beat | centered; height 105–130% |
| `offstage_left/right` | Entrance, exit, or transition | beyond safe viewport |

Exact values must be responsive and authored as normalized percentages rather than fixed pixels.

### Facing rules

- When the character is on the left, it usually faces right.
- When the character is on the right, it usually faces left.
- When asking the learner a direct personal question, a front-facing pose is preferred when available.
- The character should face the spotlighted target during explanation and face the learner during a response request.
- Horizontal flipping is acceptable for a broadly symmetrical mascot, but hand-held objects, writing, clothing details, or asymmetrical marks may require separate pose art.

### Background focus treatment

| Mode | Dim opacity | Highlight | Use |
|---|---:|---|---|
| `none` | 0 | none | Free observation and learner performance |
| `soft_context` | 0.20–0.30 | optional glow | Keep scene present during conversation |
| `guided_focus` | 0.38–0.52 | spotlight + contour | Direct attention to a person or station |
| `character_close` | 0.45–0.60 | none or subtle | Personal dialogue or reflection |
| `performance` | 0.10–0.20 | prompt card only | Learner speaking turn; guide recedes |

Avoid exceeding approximately 60% dimming because the scene should remain recognizable. Highlight treatment must not rely on color alone.

---

## 3. Dialogue-turn anatomy

Each turn should contain one speaker, one short communicative intention, one visual state, zero or one learner task, a clear completion rule, optional success and retry responses, and an explicit next turn.

### Recommended copy limits

- Primary dialogue line: usually 6–18 words; hard ceiling approximately 30 words.
- One idea per turn.
- No more than two consecutive character-only turns before learner participation.
- Captions display the spoken line verbatim unless a deliberate accessible simplification is provided.

### Learner response kinds

| Response kind | Example | Completion |
|---|---|---|
| `continue` | Tap to hear the next turn | button tap |
| `scene_target` | Find the badge table | correct target tapped |
| `choice` | Pick what the guide should do | choice selected |
| `multi_select` | Find three hobby stations | target quota met |
| `spoken_response` | Say which station you prefer | recording saved or teacher-controlled continue |
| `short_text` | Enter a safe display name | valid input submitted |
| `activity_handoff` | Start Listen and Find | handoff acknowledged |
| `automatic` | Brief reaction or entrance | audio/motion finishes |

---

## 4. Proposed content schema

The schema below describes the desired reusable primitive. Field names may be adjusted during implementation, but the separation of dialogue, character state, scene focus, response, and completion should remain.

```json
{
  "id": "u1s1_dialogue_badge_mission",
  "kind": "guided_dialogue",
  "speaker_id": "mascot_nova",
  "dialogue": {
    "text": "My friend badge is empty. Can you find the badge table?",
    "audio_url": "/audio/u1/s1/nova-badge-mission.mp3",
    "caption": "My friend badge is empty. Can you find the badge table?"
  },
  "character_state": {
    "pose_id": "curious",
    "anchor": "close_left",
    "facing": "right",
    "scale_percent": 130,
    "entrance": {
      "from": "offstage_left",
      "duration_ms": 650,
      "easing": "ease-out"
    },
    "idle": "breathe"
  },
  "scene_focus": {
    "mode": "guided_focus",
    "background_dim": 0.46,
    "target_ids": ["badge_table"],
    "highlight_style": "spotlight-outline",
    "pulse_after_ms": 4500
  },
  "response": {
    "kind": "scene_target",
    "valid_target_ids": ["badge_table"],
    "hint_after_ms": 7000
  },
  "feedback": {
    "success_text": "That’s it! They’re making name badges.",
    "retry_text": "Look for the children drawing on round cards."
  },
  "completion": {
    "type": "response_complete",
    "next_phase_id": "u1s1_dialogue_choose_name"
  },
  "learning_tags": ["scene_navigation", "badge", "listening_for_detail"]
}
```

---

## 5. State transitions

```text
ENTER TURN
   ↓
Apply scene focus + place/animate character
   ↓
Play dialogue audio and captions
   ↓
Open learner response
   ├── Incorrect → brief retry response → remain in turn
   ├── Hint delay → pulse/spotlight grows slightly → remain in turn
   └── Complete → success reaction → transition
                                           ↓
                              NEXT DIALOGUE TURN OR ACTIVITY
```

The next turn should inherit the current scene and character state unless it explicitly changes them. This avoids unnecessary resetting or character teleportation.

---

## 6. Movement and transition behavior

### Standard timings

| Motion | Recommended duration |
|---|---:|
| Side-to-side reposition | 500–800 ms |
| Close-to-corner retreat | 450–650 ms |
| Character entrance | 550–850 ms |
| Character exit | 350–600 ms |
| Horizontal turn/flip | 180–280 ms with a brief squash/fade if needed |
| Dim/spotlight transition | 220–400 ms |
| Dialogue-card change | 160–240 ms |

### Motion continuity

- Preserve the character’s last rendered position between turns.
- Animate from the current anchor to the next anchor.
- Do not replay an entrance animation on every turn.
- Move the character before or at the start of a new line, not midway through a key sentence.
- If the guide crosses the central scene, use a lower or upper travel path that does not pass over the focus target.
- During the learner’s speaking turn, the character should become smaller, move to an edge, or disappear.

### Reduced motion

When reduced motion is preferred:

- replace travel paths with a 120–180 ms crossfade;
- remove idle bobbing, floating, and repeated pulsing;
- preserve dimming, spotlight, captions, and turn logic;
- never make motion necessary to understand which target is active.

---

## 7. Dialogue panel behavior

- Keep the main text outside the important scene target whenever possible.
- Place the dialogue panel near the speaking character but not directly over its face.
- On small screens, use a bottom sheet limited to approximately one-third of the viewport.
- Captions and response controls remain readable over every background.
- The learner can replay the current line without resetting the turn.
- The learner can mute character audio while retaining captions.
- A visible speaker label or portrait identifies who is talking.
- Continue is disabled only while a required response remains incomplete; audio playback itself should not trap the learner.

---

## 8. Feedback behavior

### Correct response

Confirm the meaning, not merely correctness. Keep the reaction under one sentence and highlight the evidence where useful.

Example: “That’s it—the football is beside the art table.”

### Incorrect response

- Do not use a harsh sound or lose points during guided dialogue.
- First retry: repeat or simplify the clue.
- Second retry: narrow the visual field or add a gentle pulse.
- Third retry: model the answer, then ask the learner to confirm it.

### Open response

The character should acknowledge the learner without pretending to understand unprocessed speech.

Safe generic response: “Thanks for telling me. Let’s keep exploring.”

When speech analysis is available, feedback should still focus on task completion and one actionable language point rather than judging personality or the content of a preference.

---

## 9. Accessibility and safeguarding

- Every spoken line has a synchronized caption or full text equivalent.
- Every target has an accessible label and keyboard focus order.
- Spotlighted objects retain sufficient brightness and outline contrast.
- Focus does not become trapped in the stage.
- Character motion respects reduced-motion settings.
- Audio cues are never the only indication of a required action.
- Personal questions offer a fictional/avatar response route.
- The character must not pressure a child to disclose personal or sensitive information.
- Recordings remain within the authorized student–teacher workflow.

---

## 10. Current capability assessment

### Already supported in the project

- Story items can be scaled well beyond their authored box.
- Story images can be horizontally mirrored.
- Story items can enter, exit, idle, emphasize, and follow waypoint paths.
- Story phases can control item visibility and advance from taps, timers, sequences, and matching.
- Dialogue supports start, success, and error copy.
- Audio and TTS actions exist.
- Story phases can add highlight rings to selected items.
- Explore Hotspots already implements background dimming with a spotlight mask and outline.

### Partially supported or awkward today

- Horizontal facing is stored on an item, not changed dynamically per phase.
- Movement uses an item’s authored path rather than a per-turn destination or anchor.
- Story highlights are rings; general story phases do not use the hotspot spotlight/dimming treatment.
- Dialogue copy exists, but character state, focus state, response UI, and dialogue content are not one authored unit.
- A content author could simulate facing changes with duplicate mirrored items, but this would be fragile and difficult to maintain.

### Recommended implementation work

1. Add a reusable `guided_dialogue` phase configuration to the story/interaction schema.
2. Reuse the Explore Hotspots spotlight/dim renderer as a shared scene-focus layer.
3. Add runtime character anchors, dynamic scale, and dynamic horizontal facing.
4. Allow movement between anchors per phase without rewriting the underlying item path.
5. Add response-card types for continue, choice, scene target, spoken response, and activity handoff.
6. Persist character and scene state between consecutive dialogue turns.
7. Add authoring preview and reduced-motion preview.
8. Make `guided_dialogue` available as a learning-track beat or embeddable bridge.

---

## 11. MVP and later extensions

### MVP for Session 1

- One guide character
- Left, right, lower-corner, center, and offstage anchors
- Dynamic horizontal facing
- Dynamic scale
- Scene dimming
- One spotlight target or hotspot contour per turn
- Audio + caption + replay
- Continue, target tap, choice, and recording handoff responses
- Success, retry, and timed hint lines
- Movement and reduced-motion behavior

### Later extensions

- Multiple speakers in one conversation
- Character emotion and mouth/pose sequencing
- Inventory or quest-item reactions
- Conditional turns based on prior mastery
- Learner-avatar appearance in dialogue
- Speech-informed branching
- Camera pan or crop of very large scenes
- Persistent relationship or story state

The MVP should not wait for lip sync, generative conversation, or complex branching. The pedagogical value comes from conversational framing, directed attention, learner response, and coherent continuity.

---

## 12. Acceptance criteria

The dialogue phase is ready for curriculum use when:

- an author can create a turn without manually coordinating unrelated overlays;
- the character can appear close, reposition, scale, and face the intended direction per phase;
- the scene can dim while a hotspot or region remains clearly visible;
- the phase supports at least continue, target tap, choice, and spoken-response handoff;
- consecutive turns animate from the current state instead of resetting;
- all lines support audio, captions, replay, and mute;
- target selection works by pointer, touch, and keyboard;
- reduced-motion mode preserves meaning;
- the layout remains usable on tablet, desktop, and mobile landscape;
- analytics distinguish dialogue completion from learning evidence;
- Session 1 can be authored without duplicated mirrored mascot items or duplicated background scenes.

