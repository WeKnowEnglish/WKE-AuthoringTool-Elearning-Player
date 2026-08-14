"use client";

import { useEffect, useState } from "react";
import { Coins, Sparkles } from "lucide-react";
import { getRewards } from "@/lib/progress/rewards";
import { PRIMARY_PLAYER_UPDATED_EVENT, purchasePrimarySkill } from "@/lib/primary-player/client";
import type { PrimaryPlayerProfile, PrimarySkillId } from "@/lib/primary-player/types";

const UPGRADES: Array<{ id: PrimarySkillId; label: string; description: string; icon: typeof Sparkles }> = [
  { id: "activity_xp", label: "XP Boost", description: "+5% XP from every complete activity per rank", icon: Sparkles },
  { id: "activity_gold", label: "Gold Boost", description: "+5% Gold from every complete activity per rank", icon: Coins },
];

export function PrimaryPlayerUpgrades() {
  const [profile, setProfile] = useState<PrimaryPlayerProfile | null>(null);
  const [busy, setBusy] = useState<PrimarySkillId | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const local = getRewards();
    setProfile({ studentId: "", totalXp: local.experience, level: local.level ?? 1, goldBalance: local.gold,
      unspentSkillPoints: local.skillPoints ?? 0,
      skillRanks: { activity_xp: local.skillRanks?.activity_xp ?? 0, activity_gold: local.skillRanks?.activity_gold ?? 0 },
      economyVersion: 2, importedLocalRewardsAt: null });
    const listener = (event: Event) => setProfile((event as CustomEvent<PrimaryPlayerProfile>).detail);
    window.addEventListener(PRIMARY_PLAYER_UPDATED_EVENT, listener);
    return () => window.removeEventListener(PRIMARY_PLAYER_UPDATED_EVENT, listener);
  }, []);

  return (
    <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-lg font-extrabold">Player Upgrades</h2><p className="text-sm font-semibold text-[var(--pl-muted)]">Make every completed learning activity more rewarding.</p></div>
        <span className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-extrabold text-violet-700">{profile?.unspentSkillPoints ?? 0} Skill Points</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {UPGRADES.map(({ id, label, description, icon: Icon }) => {
          const rank = profile?.skillRanks[id] ?? 0;
          return <article key={id} className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] p-4">
            <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-[var(--pl-purple)]" /><h3 className="font-extrabold">{label}</h3></div>
            <p className="mt-1 text-xs font-semibold text-[var(--pl-muted)]">{description}</p>
            <div className="mt-3 flex items-center justify-between"><span className="text-sm font-extrabold">Rank {rank}/5</span>
              <button type="button" disabled={!profile || rank >= 5 || profile.unspentSkillPoints < 1 || busy !== null}
                onClick={async () => { setBusy(id); setError(""); try { setProfile(await purchasePrimarySkill(id)); } catch { setError("Could not buy that upgrade yet."); } finally { setBusy(null); } }}
                className="rounded-xl bg-[var(--pl-purple)] px-3 py-2 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">
                {rank >= 5 ? "Maxed" : busy === id ? "Buying…" : "Spend 1 point"}
              </button></div>
          </article>;
        })}
      </div>
      {error ? <p className="mt-3 text-sm font-bold text-red-600" role="alert">{error}</p> : null}
    </section>
  );
}
