# Chapter 2 Deep Continuity Audit

**Audit date:** 2026-08-03

**Scope:** Six unique submitted story pages plus one duplicate upload

**Learners:** Ages 9-12, CEFR A1-A2

**References:** Master Production Bible, Chapter 1 ending, Chapter 2 working canon, Character Model Lock v1, Fixed Crash-Site Scene Map v1.1, A1-A2 Language Guide, Editable Comic Format v1, and Page Continuity Checklist

## Remediation status - completed 2026-08-03

This report records the condition of the original submitted pages. Its hold decision is historical: the identified P0/P1 issues have now been corrected in a new six-page clean-art package with separate editable overlays.

- Corrected production specification: `docs/comic-production/chapter-02-remediation-spec.md`
- Canon record: `docs/comic-production/canon/chapter-02.md`
- Clean art: `public/comics/chapter-2/art/`
- Editable overlays and learning supports: `content/comics/chapter-2/overlays/`
- Preserved originals and duplicate: `docs/comic-production/source-pages/chapter-02/submitted-2026-08-03/`

The replacement package restores the Chapter 1 lineup and crash-site axis, uses one wooden treehouse, gives Grandpa Minh the trusted-adult role, locks supply ownership and the two blankets, localizes Keelan's magic, replaces feather/three-toed evidence, standardizes the six-page reader package, and removes flattened lettering from the maintained art masters.

## Overall decision

**Original submission decision: hold for a controlled continuity revision before canonical or student-facing use.**

The chapter has a strong, understandable story arc: the children choose to help Keelan, take him to a treehouse, learn more about his home, and discover that he has left a trail toward the hills. The four children remain easy to identify, Keelan remains sympathetic, and the ending creates a good reason to read Chapter 3.

The submitted set is not yet production-safe. It contains a duplicate page, an out-of-order upload sequence, a conflict with the current canonical Page 1, repeated crash-site axis reversals, major treehouse design drift, contradictory supply assignments, unstable backpack and blanket continuity, expanded magic that conflicts with Keelan's locked limits, and several dialogue and child-safety problems. The lettering is also baked into the images even though the approved lesson-player format requires clean art and editable overlays.

| Review area | Result | Summary |
|---|---|---|
| Story arc and engagement | Pass with revisions | Clear help, shelter, discovery, private concern, disappearance, and cliffhanger sequence. |
| Character identity | Pass with corrections | The color/name system remains stable; Mia's clip, backpacks, and some Keelan details drift. |
| Crash-site geography | Fail | The opening changes the Chapter 1 lineup and repeatedly flips the ship across the story axis. |
| Treehouse continuity | Fail | Exterior architecture and interior anchor points change substantially between pages. |
| Props and handoffs | Fail | Food, water, blanket, backpacks, bedding, and trail evidence do not remain controlled. |
| Keelan's abilities | Fail pending rule decision | A locked small magic effect becomes planet-, room-, and valley-scale magic while he is weak. |
| A1-A2 language | Conditional pass | Most lines are short, but several are ambiguous, unnatural, incomplete, or too abstract. |
| Learner safety and modeling | Needs story correction | The children hide an injured stranger, lie to an adult, and leave Mia alone at night without a trusted-adult plan. |
| Layout and technical format | Fail | Three canvas formats, one 11-panel page, inconsistent numbering, and flattened lettering. |

## 1. Source inventory and correct story order

There are **six unique pages, not seven**. The seventh upload is byte-for-byte identical to the fourth upload.

The narrative order is not the upload order. The coherent story sequence is:

1. Submitted upload 1: crash-site introduction
2. Submitted upload 2: home-planet magic and decision to help
3. Submitted upload 3: hidden trip through the village and arrival at the treehouse
4. Submitted upload 5: food, questions, and the other children leaving
5. Submitted upload 6: Mia and Keelan's private nighttime conversation
6. Submitted upload 4: next morning, disappearance, and trail

Submitted upload 7 is a duplicate of upload 4 and must be rejected or moved to an alternates/archive folder.

| Logical page | Submitted file suffix | Dimensions | Panels | Production note |
|---:|---|---:|---:|---|
| 1 | `72c96260...png` | 1122 x 1402 | 5 | New Page 1 variant; conflicts with current canonical Page 1. |
| 2 | `a83b2c1b...png` | 1122 x 1402 | 11 | Only the first panel is labeled, and its label reads `2`. |
| 3 | `b8125739...png` | 1055 x 1491 | 6 | Establishes the first treehouse exterior and interior references. |
| 4 | `0de5bee4...png` | 1055 x 1491 | 6 | Continues the treehouse meal and bedtime sequence. |
| 5 | `fc87239b...png` | 1024 x 1536 | 5 | Private Mia/Keelan conversation; third page format. |
| 6 | `9d962d43...png` | 1055 x 1491 | 7 | Morning disappearance and cliffhanger. |
| Duplicate | `a4659cdf...png` | 1055 x 1491 | 7 | Exact SHA-256 duplicate of logical Page 6. |

### Canonical Page 1 conflict

The submitted Page 1 is not the file currently recorded as canonical at `source-pages/chapter-02/page-01.png`. The current canonical version has six panels and reveals Keelan's magic on Page 1. The submitted version has five horizontal panels and defers the magic reveal to Page 2.

**Required decision:** choose one Page 1 as the canonical story version. If the submitted version wins, preserve the existing file as an alternate and update `canon/chapter-02.md`; do not silently overwrite the approved source. The Chapter 2 canon must also move the first magic reveal from Page 1 to Page 2.

## 2. Critical scene-breaking findings

### C1. Chapter 1-to-2 lineup and geography do not match

The final Chapter 1 panel locks the order as:

`Ethan - Leo - Mia - Zara - Keelan`

with the ship screen-left and the hollow/Keelan screen-right. Submitted Page 1 opens immediately on the same exchange, but changes the children to:

`Mia - Zara - Ethan - Leo - Keelan`

and places the ship screen-right behind Keelan. No panel shows the children regrouping or the camera crossing the axis.

The same submitted page then moves the ship back to screen-left in Panel 2. Logical Page 2 flips the ship to screen-right again in its first panel. This makes the ship, hollow, and character positions feel as if they teleport.

**Required correction:** make Chapter 2 Page 1 Panel 1 match Chapter 1's final lineup and the fixed map. Keep ship left and hollow/Keelan right until a visible movement or establishing shot authorizes a new angle. Recompose logical Page 2 Panel 1 to preserve that orientation or clearly establish the camera move.

### C2. The treehouse changes into a different location

Logical Page 3 establishes a rectangular wooden cabin built on a tree, with a conventional exterior platform, ladder/stairs, string lights, and a warm plank interior. Logical Page 6 presents a round hollow opening embedded directly in a massive trunk. The entrance, ladder, wall shape, and relationship between room and tree no longer match.

The interior also drifts across Pages 3-6:

- rectangular, round, and arched windows replace one another;
- shelves, posters, bunting, lanterns, bedding, and doorway positions move;
- the floor area and room proportions expand and contract;
- the bed/cushion arrangement changes between consecutive nighttime panels.

Camera changes can hide an anchor, but they cannot change the building's construction.

**Required correction:** create and approve a treehouse model sheet before regenerating final art. It needs a front exterior, entrance/ladder, simple floor plan, four interior wall elevations, window locations, sleeping corner, shelf positions, and a fixed prop list. Choose either the Page 3 cabin exterior or the Page 6 hollow-tree exterior as canon, then revise every conflicting panel.

### C3. The pages are flattened, not editable lesson-player masters

All dialogue, captions, panel numbers, tails, and sound effects are baked into the submitted PNGs. This conflicts with the approved two-layer production format and prevents the planned bubble pop-in, bounce, replay, art-only view, text editing, speaker metadata, and responsive placement.

**Required correction:** retain these PNGs only as visual references or print proofs. Produce clean art masters with no lettering, then create one overlay JSON file per page for dialogue, narration, panel numbers, tails, reading order, vocabulary, and discussion prompts. Do not attempt final release by placing a second set of bubbles over the baked-in text.

### C4. The chapter models unsafe secrecy without a protective reason

On Page 3, the children deliberately hide an injured being, say adults cannot know, lie to an adult about "science homework," and later leave Mia alone with Keelan at night. The reason given is only that adults will ask too many questions. This is not a credible safety reason and conflicts with the series promise that the children model empathy and careful decision-making.

**Required story decision:** either make the adult a trusted helper, or establish a concrete immediate danger and have the children choose one trusted adult who knows where they are. An adult should know Mia is at the treehouse. Preserve the adventure, but do not present secrecy and lying as the only intelligent option for 9-12-year-olds.

### C5. Keelan's ability scale breaks its own rule

The locked model allows a **small blue-white spiral/orb** and establishes that Keelan can use only a little magic while weak. The submitted chapter shows:

- a detailed planet and surrounding star field filling most of a panel on Page 2;
- a room-filling magical field on Page 5;
- glowing tracks visible across an entire valley on Page 6.

The visuals make Keelan appear substantially more powerful after he coughs and says he is weak.

**Required correction:** choose one rule and document it. The simplest fix is to keep a small palm-sized projection on Page 2, a brief localized search orb on Page 5, and a faint nearby residue on Page 6. If the large effects are intentional, the script must explain their cost and why the valley trail exists.

## 3. Major continuity findings

### M1. Supply promises, visible props, and speakers contradict one another

Page 2 assigns the jobs clearly:

- Mia: food
- Leo: blanket
- Zara: water
- Ethan: encouragement/help

Page 3 Panel 5 correctly shows Mia with food and Zara with water, but Ethan carries the rolled blanket. In Panel 6, the visible speaker/balloon placement appears to assign "I brought food" to Zara and "And water" to Ethan, while Leo says "And a blanket" although Ethan holds it.

**Required correction:** preserve the Page 2 assignment. Put the blanket with Leo in Pages 3-4, keep the food with Mia, keep the water with Zara, and give each corresponding line an explicit speaker and tail in overlay data. Ethan can help carry Keelan or prepare the sleeping area.

### M2. The blankets change identity without a transition

At least four treatments appear:

1. green/brown plaid hiding blanket on Page 3;
2. blue plaid rolled blanket brought to the treehouse;
3. brown plaid blanket over Keelan at the end of Page 4;
4. purple star blanket on Pages 5-6.

Multiple blankets are possible, but the story never distinguishes them, and the bed blanket changes between consecutive nighttime scenes.

**Required correction:** lock two named props only. For example, use one brown plaid carrying blanket and one purple star bed blanket brought by Leo. Show the swap once, then keep the purple blanket through the morning disappearance.

### M3. Backpack continuity is not controlled

Canon says each child keeps their color-coded backpack. The packs are absent through most crash-site and village panels even in side or three-quarter views where straps should appear. Packs then reappear as the children leave the treehouse, and the next morning only Ethan appears to carry a brown/tan satchel rather than his green mountain backpack.

**Required correction:** decide where each backpack is after Chapter 1 and record every handoff. If worn, show at least straps or a pack edge when the angle permits. Before-school scenes should show the four approved school bags, unless a panel explicitly shows that they were left elsewhere.

### M4. Page 6's evidence does not match Keelan's anatomy or established power

The empty bed contains blue feather-shaped objects even though Keelan has fuzzy fur, not feathers. The glowing tracks appear three-toed in several impressions even though the model locks four toes per foot. The trail then scales from small floor prints to a bright route across distant hills.

**Required correction:** replace feathers with small fur tufts or remove them; draw four-toed prints; and define the trail as a localized magic residue that the children can follow from point to point. A valley-wide glowing road is inconsistent with the small-magic rule and removes much of the search challenge.

### M5. Page 2 is overloaded and its numbering system is inconsistent

Logical Page 2 contains 11 visually separated panels, almost twice the working maximum of six. Its only parchment label is `2`, while the other pages number each panel from 1. The label can therefore be read as either a page number or an incorrect first-panel number.

**Required correction:** split or simplify this page to 5-6 panels. The four small promise panels can become one readable group shot with three short balloons. Use either per-panel numbers on every page or no visible panel numbers; for the lesson player, store panel numbers in overlays.

### M6. Page dimensions and aspect ratios are not one production system

The set uses three formats:

- 1122 x 1402 on Pages 1-2;
- 1055 x 1491 on Pages 3, 4, and 6;
- 1024 x 1536 on Page 5.

The reader can fit mixed ratios without cropping, but a single chapter should not drift between three unrecorded composition standards.

**Required correction:** prefer one approved page frame for Chapter 2. If recomposition would damage art, record intentional exceptions in the manifest and verify the smallest lettering remains readable on tablets. Never crop automatically.

### M7. Page 4 uses an unidentified off-panel call to force the scene change

Page 4 Panel 4 contains only "Leo!" in a burst balloon. The caller is not shown, no tail identifies where the voice comes from, and the next panel abruptly sends the children home.

**Required correction:** establish the caller and reason. For example, an off-panel trusted adult can call, "Leo! Time to come home!" with a clear off-panel tail. This can also help repair the adult-awareness problem.

### M8. The ship and crystal disappear from the chapter's continuity record

The children remove Keelan from the crash site, but the ship remains smoking and the Chapter 1 crystal remains inside it. Neither object is moved or secured. This is not yet a visual contradiction, but it is a high-risk continuity gap for the next chapter.

**Required documentation:** record that the damaged ship and crystal remain at the crash site, who knows their location, and whether the smoke stops before morning. Do not regenerate the site later without this state.

## 4. Character-model audit

### Mia

**Passes:** Purple dress, long black hair, age, and overall identity remain stable. She acts observant and caring.

**Corrections:** Her single hair clip flips to the opposite side in logical Page 1 Panel 3 and logical Page 3 Panel 4. Return it to her right side. Her purple backpack is absent for long sequences and then returns.

### Zara

**Passes:** Yellow sun shirt, blue jean shorts, curly hair, and yellow headband remain stable. No identity swap was found.

**Corrections:** Keep her explicitly tied to the water task. Her approved yellow/orange backpack is not consistently present.

### Leo

**Passes:** Blue wave shirt, short black hair, and energetic voice remain stable. No identity swap with Ethan was found.

**Corrections:** Leo promises the blanket, but Ethan later carries it. Restore the prop to Leo. Clarify who calls "Leo!" on Page 4. Keep the blue backpack visible when appropriate.

### Ethan

**Passes:** Green mountain shirt, curly brown hair, cargo shorts, and action-oriented support remain stable. No identity swap with Leo was found.

**Corrections:** Do not assign him Zara's water or Leo's blanket through accidental bubble placement. Replace the brown/tan morning satchel with the approved green backpack if it is meant to be his school bag.

### Keelan

**Passes:** Blue fur, orange markings, amber eyes, large ears, two-fang expression, gentle personality, and approximate child-to-Keelan scale are generally recognizable.

**Corrections:** Reduce or formally redefine magic scale; keep the medium upturned tail from becoming elongated; verify four digits and four toes in every close view; replace feather-like debris; keep the centered forehead anchor star stable; and maintain the weak condition until a visible recovery beat occurs.

## 5. Page-by-page correction map

### Page 1 - reassurance and introduction

**Preserve:** Five-panel emotional progression, simple reassurance, name reveal, language question, and help request.

**Fix:** Match Chapter 1's final lineup; restore ship-left/hollow-right geography; keep backpacks with owners; correct Mia's clip in Panel 3; clarify both speakers in Panel 3; and use one pronoun for Keelan after he introduces himself.

### Page 2 - origin, magic, and decision to help

**Preserve:** Keelan's home reveal, failed magic, cough, division of help tasks, and movement toward shelter.

**Fix:** Preserve the crash-site axis; make the projected world visually distinct from Earth; reduce magic scale; simplify to at most six panels; complete or replace the dangling "But no one can know, or they'll..." line; and standardize panel numbering.

### Page 3 - village crossing and treehouse arrival

**Preserve:** Dusk transition, blanket concealment, humorous weight beat, arrival, and supplies.

**Fix:** Resolve the trusted-adult decision; do not show Keelan glowing while the children say to hide his glow; naturalize "This hiding is very strange"; align food/water/blanket props and speakers; and lock this page's treehouse exterior if it is chosen as canon.

### Page 4 - meal, home questions, and bedtime

**Preserve:** Food as care, questions about home, emotional distance, and the decision to return in the morning.

**Fix:** Clarify the off-panel "Leo!" call; stabilize the interior; keep one bed blanket; leave the promised blanket with Keelan; maintain backpack identities; and correct the nonresponsive "Yeah, me too!" line.

### Page 5 - private nighttime conversation

**Preserve:** Quiet Mia/Keelan scene, Keelan's worry, search attempt, and revelation that he cannot find others like him. This is the strongest emotional page.

**Fix:** Match Page 4's room and bedding; replace the nonsensical response "I'm trying" to "You look worried"; reduce the room-filling magic; and simplify `species` or support it explicitly.

### Page 6 - disappearance and cliffhanger

**Preserve:** Good-night bridge, morning return, missing Keelan, evidence, outward view, and turn-page hook.

**Fix:** Use the approved treehouse exterior/interior; restore all school backpacks; replace feathers and correct footprints; reduce or explain the valley-scale trail; make final speakers explicit; reduce to six panels if possible; and keep only one canonical copy.

## 6. A1-A2 dialogue corrections

Most balloons are short and visually supported. The following changes are recommended before lettering approval:

| Page/panel | Current line | Issue | Recommended line |
|---|---|---|---|
| 1/3 | "It talks!" | Switches from `it` to `he` in the same panel after Keelan gives his name. | "He can talk!" |
| 2/2 | "I was born here." | `Here` can mean the current forest, and the projected planet looks like Earth. | "This is my home planet." or "I was born there." |
| 2/6 | "But no one can know, or they'll..." | Incomplete, abstract, and leads into unsafe secrecy. | Rewrite after the adult/safety decision; for example, "He needs a safe place." |
| 3/1 | "This hiding is very strange." | Unnatural English. | "This is a strange way to hide." |
| 3/3 | "Because they'll ask too many questions." | Weak motivation for deceiving adults. | Replace with the approved trusted-adult plan. |
| 4/1 | "I will be alright." | Less natural classroom model and inconsistent style. | "I'll be all right." |
| 4/2 | "Where are you from? Does your home have food like this?" | Two ideas and a long bubble. | "Do you eat food like this at home?" |
| 4/5 | "Yeah, me too!" | Does not answer "Let's meet here before school." | "Okay. See you then!" |
| 4/5 | "I gotta go!" | `Gotta` is useful spoken exposure but not the best A1-A2 reading model here. | "I have to go!" |
| 4/6 | "Good night guys." | Missing direct-address comma. | "Good night, guys." |
| 5/2 | "I'm trying." | Does not logically answer "You look worried." | "I am." or "I'm trying to find someone." |
| 5/5 | "Any of my species." | Abstract and unnatural for this learner level. | "Anyone like me." |
| 6/7 | "He went looking for his species." | Abstract and less natural than the visual meaning. | "He went to find others like him." |

### Suggested chapter language focus

The most coherent communicative goal is **asking about someone's home and offering help**.

Useful repeated frames already supported by the story include:

- "Where is your home?"
- "Are you feeling better?"
- "I can..." / "I can't..."
- "I'll bring..."
- "We have to help/find..."

Recommended target words: `help`, `home`, `planet`, `weak`, `safe`, `blanket`, `worried`, `trail`, `find`, and `hills`. If `species` remains, teach it as a deliberate vocabulary word and pair it with the simpler phrase `others like me`.

## 7. Lettering and interaction audit

Every line needs a canonical speaker in overlay data. The most ambiguous locations are:

- Page 1 Panel 3: "It talks!" and "He talks really well..."
- Page 2 Panel 1: the home-planet question
- Page 2 decision panel: the incomplete secrecy line
- Page 3 Panels 2-4: hiding instructions, adult explanation, and homework replies
- Page 3 Panel 6: food, water, and blanket lines
- Page 4 Panel 4: the off-panel "Leo!" call
- Page 6 final panel: who infers Keelan's goal and who answers

For each page, the overlay should include:

- unique reading-order numbers;
- explicit `speaker` values;
- tail coordinates that terminate near the speaker's mouth, not between characters;
- narration and panel numbers as separate elements;
- one vocabulary link only when it supports the page goal;
- one purposeful prompt for prediction, retelling, inference, or safety reflection.

## 8. Production strengths to preserve

- The four children never swap color identities.
- Zara remains in yellow with jean shorts; Leo remains blue and Ethan remains green.
- The children move from fear to empathy in a way learners can understand visually.
- The task-allocation montage provides useful future-tense language.
- Food, water, warmth, and concern make `help` concrete.
- Mia and Keelan's private scene gives the chapter emotional depth.
- The morning discovery is easy to retell with `first`, `next`, `then`, and `finally`.
- The final trail toward the hills is a strong Chapter 3 hook once its magic rule is controlled.

## 9. Prioritized remediation plan

### P0 - resolve before any more final art is generated

1. Confirm the six-page narrative order and remove the duplicate.
2. Choose which Chapter 2 Page 1 is canonical and update the canon record.
3. Correct the Chapter 1-to-2 lineup and crash-site axis.
4. Choose the canonical treehouse design and create its exterior/interior model sheet.
5. Decide the trusted-adult and learner-safety story treatment.
6. Lock Keelan's magic and trail rules.
7. Obtain clean, unlettered art masters.

### P1 - correct before student release

1. Align food, water, and blanket ownership and dialogue.
2. Lock backpack, blanket, food, water, ship, and crystal state.
3. Correct Mia's clip and Keelan's fur/footprint anatomy.
4. Simplify Page 2 and standardize panel numbering.
5. Normalize or explicitly approve page formats.
6. Apply the A1-A2 dialogue corrections.
7. Build and validate one overlay JSON file per page.

### P2 - final polish

1. Clarify every balloon tail and off-panel speaker.
2. Standardize minor room props such as the snack bowl, lantern, notebook, and pillows.
3. Verify tablet-size lettering, safe areas, and reading order.
4. Add one page-level learning prompt and a short end-of-chapter retelling activity.

## 10. Acceptance checklist for Chapter 2 v1

- [ ] Exactly six unique canonical page files exist in the correct story order.
- [ ] One Page 1 is formally approved; the other is preserved as an alternate.
- [ ] Page 1 begins from the final Chapter 1 positions and fixed crash-site map.
- [ ] No unestablished camera-axis crossing moves the ship or hollow.
- [ ] One approved treehouse model is followed on every exterior and interior page.
- [ ] Mia/food, Zara/water, and Leo/blanket match both art and dialogue.
- [ ] Each backpack remains with its owner or has a visible, scripted handoff.
- [ ] Keelan's magic, footprints, fur, digits, toes, fangs, tail, and markings match the model lock.
- [ ] The adult-awareness and nighttime-safety logic is suitable for ages 9-12.
- [ ] All pages use an approved frame and a consistent numbering policy.
- [ ] Clean art and overlay JSON are the maintained masters.
- [ ] Every line has one speaker, tail, and reading-order value.
- [ ] The revised dialogue passes an A1-A2 read-aloud and retell test.
- [ ] The chapter record states the final location of the ship, crystal, backpacks, and blankets.

## Final assessment

**The chapter should be preserved, not restarted.** Its emotional structure and central mystery work. The correction pass should concentrate on geography, the treehouse, prop ownership, magic rules, safety logic, and editable production layers. Once those systems are locked, most dialogue issues can be fixed in overlays without redrawing the character performances.
