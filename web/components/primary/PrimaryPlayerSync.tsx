"use client";

import { useEffect, useState } from "react";
import { Coins, Sparkles } from "lucide-react";
import { PRIMARY_REWARD_RECEIPT_EVENT, syncPrimaryPlayer } from "@/lib/primary-player/client";
import type { PrimaryRewardReceipt } from "@/lib/primary-player/types";

export function PrimaryPlayerSync() {
  const [receipt, setReceipt] = useState<PrimaryRewardReceipt | null>(null);

  useEffect(() => {
    void syncPrimaryPlayer().catch(() => {
      // Keep the existing local experience available when offline.
    });
    const listener = (event: Event) => {
      const next = (event as CustomEvent<PrimaryRewardReceipt>).detail;
      setReceipt(next);
      window.setTimeout(() => setReceipt((current) => current?.eventId === next.eventId ? null : current), 2600);
    };
    window.addEventListener(PRIMARY_REWARD_RECEIPT_EVENT, listener);
    return () => window.removeEventListener(PRIMARY_REWARD_RECEIPT_EVENT, listener);
  }, []);

  if (!receipt) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-5 z-[100] -translate-x-1/2 animate-in slide-in-from-top-3 fade-in">
      <div className="flex items-center gap-4 rounded-2xl border border-violet-200 bg-white px-5 py-3 font-extrabold shadow-xl">
        <span className="flex items-center gap-1 text-violet-700"><Sparkles className="h-5 w-5" />+{receipt.awardedXp} XP</span>
        <span className="flex items-center gap-1 text-amber-600"><Coins className="h-5 w-5" />+{receipt.awardedGold} Gold</span>
        {receipt.levelSkillPoints > 0 ? <span className="text-teal-700">You have a Skill Point!</span> : null}
      </div>
    </div>
  );
}
