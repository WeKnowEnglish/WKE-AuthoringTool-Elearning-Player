"use client";



import { clsx } from "clsx";

import { KidButton } from "@/components/kid-ui/KidButton";

import { playSfx } from "@/lib/audio/sfx";

import { DAILY_QUEST_XP } from "@/lib/progress/rewards";

import { useClientHydrated } from "@/lib/react/use-client-hydrated";

import {

  DAILY_CHEST_GOLD,

  DAILY_CHEST_XP,

  DAILY_QUEST_PER_GOLD,

  getDailyQuestUiRows,

  openDailyTreasureChest,

} from "@/lib/teststartpage/daily-quests";



type Props = {

  muted: boolean;

  onEconomyChange: () => void;

  /** Drawer/sheet layout — no outer card chrome or duplicate title. */

  embedded?: boolean;

  className?: string;

};



export function DailyQuestsPanel({ muted, onEconomyChange, embedded = false, className }: Props) {

  const hydrated = useClientHydrated();

  const model = hydrated ? getDailyQuestUiRows() : null;



  function handleOpenChest() {

    playSfx("tap", muted);

    const ok = openDailyTreasureChest();

    if (ok) {

      playSfx("complete", muted);

      onEconomyChange();

    }

  }



  const shellClass = clsx(

    "space-y-3",

    embedded ? "p-0" : "mt-4 rounded-xl border-4 border-kid-ink bg-kid-panel p-3",

    className,

  );



  if (!model) {

    return (

      <div className={shellClass}>

        {!embedded ? (

          <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/90">Daily quests</p>

        ) : null}

        <p className="text-sm font-semibold text-kid-ink/75">Loading your quests…</p>

      </div>

    );

  }



  const questsDone = model.rows.filter((r) => r.targetMet).length;



  return (

    <div className={shellClass}>

      {!embedded ? (

        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/90">Daily quests</p>

      ) : null}

      <p className="text-sm font-bold text-kid-ink">

        {questsDone}/{model.rows.length} goals met — {DAILY_QUEST_PER_GOLD} gold + {DAILY_QUEST_XP} XP each

      </p>

      <ul className="space-y-2 text-sm font-semibold text-kid-ink">

        {model.rows.map((r) => (

          <li key={r.id} className="flex flex-col gap-0.5 border-b-2 border-kid-ink/15 pb-2 last:border-0 last:pb-0">

            <span className="leading-snug">{r.label}</span>

            <span className="tabular-nums text-kid-ink/85">

              {r.current}/{r.target}

              {r.targetMet ? (

                <span className="ml-2 text-emerald-700">

                  {r.smallRewardGranted ?

                    `Done (+${DAILY_QUEST_PER_GOLD}g, +${DAILY_QUEST_XP} XP)`

                  : "Done"}

                </span>

              ) : null}

            </span>

          </li>

        ))}

      </ul>

      <div className="border-t-2 border-kid-ink/20 pt-3">

        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/90">Treasure chest</p>

        {model.chestLootClaimed ? (

          <p className="mt-1 text-sm font-semibold text-kid-ink/80">Opened today. Come back tomorrow for new quests.</p>

        ) : model.chestOpenable ? (

          <div className="mt-2 space-y-2">

            <p className="text-sm font-semibold text-kid-ink">

              All goals complete! Open for {DAILY_CHEST_GOLD} gold and {DAILY_CHEST_XP} XP.

            </p>

            <KidButton type="button" variant="primary" className="w-full text-base" onClick={handleOpenChest}>

              Open treasure chest

            </KidButton>

          </div>

        ) : (

          <p className="mt-1 text-sm font-semibold text-kid-ink/80">

            Finish all five goals today to unlock the chest.

          </p>

        )}

      </div>

    </div>

  );

}

