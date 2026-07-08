"use client";



import type { GrammarModule } from "@/lib/grammar-builder/schema";

import {

  addCard,

  canAddCard,

  canRemoveCard,

  getMaxCardCount,

  moveCard,

  removeCard,

} from "@/lib/grammar-builder/editor/grammar-card-structure-mutations";



type Props = {

  draft: GrammarModule;

  selectedCardId: number | null;

  onChange: (module: GrammarModule) => void;

  onSelectCard: (cardId: number | null) => void;

};



export function GrammarPosterCardOrderControls({

  draft,

  selectedCardId,

  onChange,

  onSelectCard,

}: Props) {

  const maxCards = getMaxCardCount(draft.difficulty);

  const atMax = !canAddCard(draft);



  return (

    <section className="space-y-2 border-t border-dashed border-kid-ink/15 pt-3">

      <div className="flex items-center justify-between gap-2">

        <h3 className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">

          Cards ({draft.cards.length}

          {maxCards !== null ? ` / ${maxCards}` : ""})

        </h3>

        <button

          type="button"

          disabled={atMax}

          onClick={() => {

            const next = addCard(draft);

            const newCard = next.cards[next.cards.length - 1];

            onChange(next);

            if (newCard) {

              onSelectCard(newCard.id);

            }

          }}

          className="rounded border border-kid-ink/20 px-2 py-0.5 text-xs font-bold disabled:opacity-30"

        >

          + Add

        </button>

      </div>

      {atMax && maxCards !== null ?

        <p className="text-xs font-medium text-amber-800">

          {draft.difficulty} posters allow at most {maxCards} cards.

        </p>

      : null}

      <ul className="space-y-1">

        {draft.cards.map((card, index) => (

          <li

            key={card.id}

            className="flex items-center justify-between gap-2 rounded-lg border border-kid-ink/15 bg-white/70 px-2 py-1.5"

          >

            <button

              type="button"

              onClick={() => onSelectCard(card.id)}

              className={

                selectedCardId === card.id ?

                  "min-w-0 flex-1 truncate text-left text-sm font-extrabold text-kid-ink"

                : "min-w-0 flex-1 truncate text-left text-sm font-semibold text-kid-ink/80"

              }

            >

              {card.id}. {card.kidTitle ?? card.title}

            </button>

            <span className="flex shrink-0 gap-1">

              <button

                type="button"

                disabled={index === 0}

                onClick={() => onChange(moveCard(draft, card.id, "up"))}

                className="rounded border border-kid-ink/20 px-2 py-0.5 text-xs font-bold disabled:opacity-30"

                aria-label={`Move card ${card.id} up`}

              >

                ↑

              </button>

              <button

                type="button"

                disabled={index === draft.cards.length - 1}

                onClick={() => onChange(moveCard(draft, card.id, "down"))}

                className="rounded border border-kid-ink/20 px-2 py-0.5 text-xs font-bold disabled:opacity-30"

                aria-label={`Move card ${card.id} down`}

              >

                ↓

              </button>

              <button

                type="button"

                disabled={!canRemoveCard(draft)}

                onClick={() => {

                  const next = removeCard(draft, card.id);

                  onChange(next);

                  if (selectedCardId === card.id) {

                    onSelectCard(next.cards[0]?.id ?? null);

                  }

                }}

                className="rounded border border-red-300 px-2 py-0.5 text-xs font-bold text-red-700 disabled:opacity-30"

                aria-label={`Remove card ${card.id}`}

              >

                ×

              </button>

            </span>

          </li>

        ))}

      </ul>

    </section>

  );

}

