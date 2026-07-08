"use client";



import { useEffect, useMemo, useState } from "react";

import type { GrammarCard, GrammarInteraction, GrammarModule } from "@/lib/grammar-builder/schema";

import {

  addInteraction,

  createInteractionId,

  removeInteraction,

} from "@/lib/grammar-builder/editor/grammar-interaction-mutations";

import {

  formatInteractionTargetLabel,

  getInteractionTargetOptions,

} from "@/lib/grammar-builder/editor/interaction-target-options";

import type { InteractionTargetKey } from "@/lib/grammar-builder/interactions/resolve-interaction-target";

import { EditorFieldLabel, EditorTextInput } from "./fields/EditorFields";



type Props = {

  draft: GrammarModule;

  card: GrammarCard;

  pickedTargetKey?: InteractionTargetKey | null;

  onChange: (module: GrammarModule) => void;

};



type ActionType = GrammarInteraction["action"];



const ACTION_OPTIONS: { value: ActionType; label: string }[] = [

  { value: "reveal", label: "Reveal text" },

  { value: "highlight", label: "Highlight" },

  { value: "toggle", label: "Toggle text" },

  { value: "play-audio", label: "Play audio (TTS)" },

];



export function GrammarPosterInteractionsPanel({

  draft,

  card,

  pickedTargetKey,

  onChange,

}: Props) {

  const [action, setAction] = useState<ActionType>("reveal");

  const [targetKey, setTargetKey] = useState("");

  const [revealText, setRevealText] = useState("");

  const [revealLabel, setRevealLabel] = useState("");

  const [toggleA, setToggleA] = useState("");

  const [toggleB, setToggleB] = useState("");

  const [audioText, setAudioText] = useState("");

  const [audioLang, setAudioLang] = useState("en-US");

  const [audioLabel, setAudioLabel] = useState("");



  const targetOptions = useMemo(() => getInteractionTargetOptions(card), [card]);

  const cardInteractions = (draft.interactions ?? []).filter(

    (interaction) => interaction.target.cardId === card.id,

  );



  useEffect(() => {

    if (pickedTargetKey && targetOptions.some((option) => option.value === pickedTargetKey)) {

      setTargetKey(pickedTargetKey);

    }

  }, [pickedTargetKey, targetOptions]);



  function handleAddInteraction() {

    const selectedTarget = targetOptions.find((option) => option.value === targetKey)?.target;

    if (!selectedTarget) {

      return;

    }



    const id = createInteractionId(draft, card.id, action);

    let interaction: GrammarInteraction;



    if (action === "reveal") {

      if (!revealText.trim()) {

        return;

      }

      interaction = {

        id,

        target: selectedTarget,

        trigger: "tap",

        action: "reveal",

        payload: {

          text: revealText.trim(),

          label: revealLabel.trim() || undefined,

        },

      };

    } else if (action === "highlight") {

      interaction = {

        id,

        target: selectedTarget,

        trigger: "tap",

        action: "highlight",

        payload: { durationMs: 900 },

      };

    } else if (action === "play-audio") {

      if (!audioText.trim()) {

        return;

      }

      interaction = {

        id,

        target: selectedTarget,

        trigger: "tap",

        action: "play-audio",

        payload: {

          text: audioText.trim(),

          lang: audioLang.trim() || undefined,

          label: audioLabel.trim() || undefined,

        },

      };

    } else {

      if (!toggleA.trim() || !toggleB.trim()) {

        return;

      }

      interaction = {

        id,

        target: selectedTarget,

        trigger: "tap",

        action: "toggle",

        payload: {

          textA: toggleA.trim(),

          textB: toggleB.trim(),

          initial: "a",

        },

      };

    }



    onChange(addInteraction(draft, interaction));

    setRevealText("");

    setRevealLabel("");

    setToggleA("");

    setToggleB("");

    setAudioText("");

    setAudioLabel("");

  }



  return (

    <section className="space-y-3 border-t border-dashed border-kid-ink/15 pt-3">

      <h3 className="text-xs font-extrabold uppercase tracking-wide text-kid-ink">

        Interactions

      </h3>

      <p className="text-xs font-medium text-kid-ink/55">

        Click a region on the canvas to pick a target, or choose from the list below.

      </p>



      {cardInteractions.length > 0 ?

        <ul className="space-y-2">

          {cardInteractions.map((interaction) => (

            <li

              key={interaction.id}

              className="rounded-lg border border-kid-ink/15 bg-white/80 px-2 py-2 text-sm"

            >

              <div className="flex items-start justify-between gap-2">

                <div>

                  <p className="font-bold text-kid-ink">{interaction.action}</p>

                  <p className="text-xs font-medium text-kid-ink/60">

                    {formatInteractionTargetLabel(interaction, card)}

                  </p>

                </div>

                <button

                  type="button"

                  onClick={() => onChange(removeInteraction(draft, interaction.id))}

                  className="text-xs font-bold text-red-700"

                >

                  Remove

                </button>

              </div>

            </li>

          ))}

        </ul>

      : <p className="text-sm font-semibold text-kid-ink/50">No interactions on this card yet.</p>}



      <div className="space-y-2 rounded-lg border border-dashed border-kid-ink/20 bg-white/60 p-3">

        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/60">

          Add interaction

        </p>

        <div>

          <EditorFieldLabel>Target</EditorFieldLabel>

          <select

            value={targetKey}

            onChange={(event) => setTargetKey(event.target.value)}

            className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1.5 text-sm font-semibold"

          >

            <option value="">Select target…</option>

            {targetOptions.map((option) => (

              <option key={option.value} value={option.value}>

                {option.label}

              </option>

            ))}

          </select>

        </div>

        <div>

          <EditorFieldLabel>Action</EditorFieldLabel>

          <select

            value={action}

            onChange={(event) => setAction(event.target.value as ActionType)}

            className="mt-1 w-full rounded-lg border-2 border-kid-ink/20 bg-white px-2 py-1.5 text-sm font-semibold"

          >

            {ACTION_OPTIONS.map((option) => (

              <option key={option.value} value={option.value}>

                {option.label}

              </option>

            ))}

          </select>

        </div>



        {action === "reveal" ?

          <>

            <div>

              <EditorFieldLabel>Reveal text</EditorFieldLabel>

              <EditorTextInput value={revealText} onChange={setRevealText} />

            </div>

            <div>

              <EditorFieldLabel>Label (optional)</EditorFieldLabel>

              <EditorTextInput value={revealLabel} onChange={setRevealLabel} placeholder="Hint" />

            </div>

          </>

        : null}



        {action === "toggle" ?

          <>

            <div>

              <EditorFieldLabel>Text A</EditorFieldLabel>

              <EditorTextInput value={toggleA} onChange={setToggleA} />

            </div>

            <div>

              <EditorFieldLabel>Text B</EditorFieldLabel>

              <EditorTextInput value={toggleB} onChange={setToggleB} />

            </div>

          </>

        : null}



        {action === "play-audio" ?

          <>

            <div>

              <EditorFieldLabel>Text to speak</EditorFieldLabel>

              <EditorTextInput value={audioText} onChange={setAudioText} />

            </div>

            <div>

              <EditorFieldLabel>Language</EditorFieldLabel>

              <EditorTextInput value={audioLang} onChange={setAudioLang} placeholder="en-US" />

            </div>

            <div>

              <EditorFieldLabel>Label (optional)</EditorFieldLabel>

              <EditorTextInput value={audioLabel} onChange={setAudioLabel} placeholder="Listen" />

            </div>

          </>

        : null}



        <button

          type="button"

          onClick={handleAddInteraction}

          className="w-full rounded-lg border-2 border-kid-ink bg-kid-cta px-3 py-2 text-sm font-bold text-kid-ink"

        >

          Add interaction

        </button>

      </div>

    </section>

  );

}

