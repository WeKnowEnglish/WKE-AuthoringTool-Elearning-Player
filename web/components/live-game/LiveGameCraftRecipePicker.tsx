"use client";

import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import type {
  LiveGameCraftedItems,
  LiveGamePlayerCarry,
  LiveGamePlayerInventory,
  LiveGameResourcePool,
} from "@/lib/live-game/liveblocks/config";
import {
  canStartRecipeCraft,
  formatRecipeFullCostSummary,
  getRecipeDisabledReason,
  listBenchCraftRecipes,
  type CraftRecipe,
  type CraftRecipeId,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";

type Props = {
  open: boolean;
  pool: LiveGameResourcePool;
  craftedItems: LiveGameCraftedItems;
  playerId?: string | null;
  playerInventory?: LiveGamePlayerInventory;
  playerCarry?: LiveGamePlayerCarry | null;
  onSelect: (recipeId: CraftRecipeId, recipe: CraftRecipe) => void;
  onClose: () => void;
};

function RecipeRow({
  recipe,
  enabled,
  disabledReason,
  onSelect,
}: {
  recipe: CraftRecipe;
  enabled: boolean;
  disabledReason: string | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onSelect}
      className={clsx(
        "w-full rounded-xl border-2 px-4 py-3 text-left transition-colors",
        enabled ?
          "border-kid-ink/25 bg-kid-surface hover:border-emerald-500/60 hover:bg-emerald-50"
        : "cursor-not-allowed border-kid-ink/15 bg-kid-surface-muted opacity-70",
      )}
    >
      <p className="text-base font-extrabold text-kid-ink">{recipe.label}</p>
      <p className="mt-1 text-sm font-semibold text-kid-ink/70">
        Cost: {formatRecipeFullCostSummary(recipe)}
      </p>
      {!enabled && disabledReason ?
        <p className="mt-1 text-sm font-semibold text-red-700">{disabledReason}</p>
      : null}
    </button>
  );
}

export function LiveGameCraftRecipePicker({
  open,
  pool,
  craftedItems,
  playerId = null,
  playerInventory,
  playerCarry = null,
  onSelect,
  onClose,
}: Props) {
  const storageSnapshot = {
    session: { phase: "playing" as const },
    resourcePool: pool,
    craftedItems,
    playerInventory:
      playerId && playerInventory ? { [playerId]: playerInventory } : undefined,
    playerCarry: playerId && playerCarry ? { [playerId]: playerCarry } : undefined,
  };
  const recipes = listBenchCraftRecipes(storageSnapshot);

  return (
    <AnimatePresence>
      {open ?
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border-4 border-kid-ink bg-white p-5 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-game-craft-picker-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="live-game-craft-picker-title" className="text-xl font-extrabold text-kid-ink">
                Craft at workbench
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-sm font-bold text-kid-ink/70 hover:bg-kid-surface"
              >
                Close
              </button>
            </div>

            <p className="mb-4 text-sm font-semibold text-kid-ink/80">
              Choose a recipe. Each craft uses a sentence challenge.
            </p>

            <div className="space-y-3">
              {recipes.map((recipe) => {
                const enabled = canStartRecipeCraft(storageSnapshot, recipe.id, playerId);
                const disabledReason =
                  recipe.requires.backpackNotOwned && playerInventory?.backpack ?
                    "You already have a backpack."
                  : recipe.requires.freeCarrySlot &&
                      playerId &&
                      !canStartRecipeCraft(storageSnapshot, recipe.id, playerId) &&
                      getRecipeDisabledReason(pool, craftedItems, recipe) == null ?
                    "Hands are full — deposit or eat something first."
                  : getRecipeDisabledReason(pool, craftedItems, recipe);
                return (
                  <RecipeRow
                    key={recipe.id}
                    recipe={recipe}
                    enabled={enabled}
                    disabledReason={disabledReason}
                    onSelect={() => onSelect(recipe.id, recipe)}
                  />
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <KidButton variant="secondary" onClick={onClose}>
                Cancel
              </KidButton>
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
