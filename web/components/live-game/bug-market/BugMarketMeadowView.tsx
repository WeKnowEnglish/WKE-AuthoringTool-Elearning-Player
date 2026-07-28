"use client";

import Image from "next/image";
import { type ReactNode } from "react";
import { ExploreSceneDpad } from "@/components/lesson/interactions/explore-scene/ExploreSceneDpad";
import { KidButton } from "@/components/kid-ui/KidButton";
import { RemotePlayers } from "@/components/live-game/RemotePlayer";
import { resolveLiveGameCharacter } from "@/lib/live-game/characters/live-game-characters";
import type { RemotePlayerState } from "@/lib/live-game/hooks/useRemotePlayers";
import { BUG_MARKET_ASSETS, BUG_MARKET_SPECIES } from "@/lib/live-game/modes/bug-market/assets";
import { BUG_MARKET_MAP_V1, BUG_MARKET_MAP_V1_DOCUMENT } from "@/lib/live-game/modes/bug-market/map-v1";
import { getBugMarketMapRegion } from "@/lib/live-game/modes/bug-market/map-schema";
import { BUG_MARKET_STARTING_CAPACITY, type BugMarketInventoryItem, type BugMarketWorldBug } from "@/lib/live-game/modes/bug-market/state";

export type BugMarketSaleQuestion = { prompt: string; options: string[] };

type Props = {
  bugs: BugMarketWorldBug[];
  localPlayer: { name: string; avatarId: string; x: number; y: number; moving: boolean; swinging: boolean };
  remotePlayers: RemotePlayerState[];
  inventory: BugMarketInventoryItem[];
  coins: number;
  netLevel: number;
  feedback: string;
  catching?: boolean;
  saleBusy?: boolean;
  saleQuestion?: BugMarketSaleQuestion | null;
  onMoveAxis: (axisX: number, axisY: number) => void;
  onSwing: () => void;
  onSell: () => void;
  onUpgrade: () => void;
  onSaleAnswer: (answer: string) => void;
  onCloseSale: () => void;
  developerOverlay?: ReactNode;
};

const MAP = BUG_MARKET_MAP_V1;
const MAP_DOCUMENT = BUG_MARKET_MAP_V1_DOCUMENT;
const BUG_REGION = getBugMarketMapRegion(MAP_DOCUMENT, "bug_spawn");
const COUNTER_REGION = getBugMarketMapRegion(MAP_DOCUMENT, "counter");
const SHOP_REGION = getBugMarketMapRegion(MAP_DOCUMENT, "upgrade_shop");
const regionStyle = (region: { x: number; y: number; w: number; h: number }) => ({
  left: `${region.x / MAP.widthPx * 100}%`,
  top: `${region.y / MAP.heightPx * 100}%`,
  width: `${region.w / MAP.widthPx * 100}%`,
  height: `${region.h / MAP.heightPx * 100}%`,
});

function SmoothLocalPlayer({ player }: { player: Props["localPlayer"] }) {
  const avatar = resolveLiveGameCharacter(player.avatarId);
  return <div className="pointer-events-none absolute z-30 h-[14%] w-[8%] min-w-12 -translate-y-1/2 will-change-[left,top]" style={{ left: `${player.x / MAP.widthPx * 100}%`, top: `${player.y / MAP.heightPx * 100}%`, filter: player.moving ? "drop-shadow(0 8px 5px #0005)" : "drop-shadow(0 5px 3px #0004)" }}>
    <Image src={avatar.src} alt={player.name} fill className="object-contain object-bottom" sizes="100px" unoptimized priority />
    <div className={`absolute -right-[48%] top-[20%] h-[65%] w-[85%] origin-bottom-left transition-transform duration-300 ${player.swinging ? "rotate-[75deg] scale-110" : "-rotate-[18deg]"}`}><Image src={BUG_MARKET_ASSETS.nets} alt="Starter net" width={210} height={140} className="absolute left-0 top-0 h-auto w-[210px] max-w-none -translate-y-3" unoptimized /></div>
    <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-950/85 px-2 py-0.5 text-[10px] font-black">{player.name}</span>
  </div>;
}

export function BugMarketMeadowView({ bugs, localPlayer, remotePlayers, inventory, coins, netLevel, feedback, catching = false, saleBusy = false, saleQuestion, onMoveAxis, onSwing, onSell, onUpgrade, onSaleAnswer, onCloseSale, developerOverlay }: Props) {
  return <main tabIndex={0} autoFocus aria-label="Bug Market meadow" className="fixed inset-0 overflow-hidden bg-emerald-950 text-white outline-none">
    <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-5">
      <div className="relative aspect-[16/9] w-full max-w-[1280px] overflow-hidden rounded-2xl border-4 border-emerald-950/60 shadow-2xl" style={{ backgroundColor: MAP_DOCUMENT.terrain.backgroundColor, backgroundImage: `url('${MAP_DOCUMENT.terrain.textureUrl}')`, backgroundPosition: "left top", backgroundRepeat: "repeat", backgroundSize: `${MAP_DOCUMENT.terrain.tileSizePx}px ${MAP_DOCUMENT.terrain.tileSizePx}px` }}>
        <div className="absolute rounded-[3rem] border-4 border-dashed border-emerald-900/35 bg-emerald-300/10" style={regionStyle(BUG_REGION.displayBounds)}>
          {bugs.filter((bug) => bug.state === "available").map((bug) => { const species = BUG_MARKET_SPECIES.find((item) => item.id === bug.speciesId); return species ? <div key={bug.id} className="absolute h-14 w-14 sm:h-20 sm:w-20" style={{ left: `${bug.x / MAP.widthPx * 100}%`, top: `${bug.y / MAP.heightPx * 100}%` }}><Image src={species.assetUrl} alt={species.name} fill className="object-contain drop-shadow-lg" sizes="80px" unoptimized /></div> : null; })}
        </div>
        <div className="absolute rounded-3xl border-4 border-amber-950/35 bg-amber-200/70" style={regionStyle(COUNTER_REGION.displayBounds)}><span className="absolute left-4 top-3 text-xs font-black uppercase tracking-widest text-amber-950/70">{COUNTER_REGION.label}</span></div>
        <div className="absolute flex items-center justify-center rounded-3xl border-4 border-violet-950/40 bg-violet-300/75 text-center text-sm font-black uppercase text-violet-950" style={regionStyle(SHOP_REGION.displayBounds)}>{SHOP_REGION.label}</div>
        <RemotePlayers map={MAP} players={remotePlayers} />
        <SmoothLocalPlayer key={`${localPlayer.name}:${localPlayer.avatarId}`} player={localPlayer} />
      </div>
    </div>
    <div className="pointer-events-none absolute inset-0 z-40 flex flex-col p-3 pt-14 sm:p-5 sm:pt-16">
      <div className="flex items-center gap-2"><span className="w-fit rounded-xl bg-black/65 px-3 py-2 text-xs font-black">{feedback}</span><span className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-amber-950">{coins} coins</span></div>
      <div className="pointer-events-auto mt-auto flex flex-wrap items-end gap-3"><div className="rounded-2xl bg-black/60 p-1.5"><ExploreSceneDpad axisX={0} axisY={0} onAxisChange={onMoveAxis} /></div><KidButton type="button" variant="accent" disabled={catching} onClick={onSwing}>Swing net <span className="hidden sm:inline">(Space)</span></KidButton>{inventory.length > 0 ? <KidButton type="button" variant="primary" disabled={saleBusy} onClick={onSell}>Sell first bug</KidButton> : null}{netLevel < 2 ? <KidButton type="button" variant="secondary" disabled={saleBusy} onClick={onUpgrade}>Upgrade net · 4 coins</KidButton> : <span className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-cyan-950">Long net · 180px range</span>}</div>
    </div>
    <section className="pointer-events-none absolute bottom-3 right-3 z-40 w-64 rounded-2xl border-2 border-white/30 bg-black/70 p-3 shadow-xl backdrop-blur sm:bottom-5 sm:right-5">
      <div className="flex items-center justify-between"><h2 className="text-sm font-black">Display case</h2><span className="text-xs font-black">{inventory.length}/{BUG_MARKET_STARTING_CAPACITY}</span></div>
      <div className="mt-2 grid grid-cols-6 gap-1.5">{Array.from({ length: BUG_MARKET_STARTING_CAPACITY }, (_, index) => { const species = BUG_MARKET_SPECIES.find((item) => item.id === inventory[index]?.speciesId); return <div key={index} className="relative aspect-square rounded-lg border border-white/25 bg-white/10">{species ? <Image src={species.assetUrl} alt={species.name} fill className="object-contain p-0.5" sizes="36px" unoptimized /> : null}</div>; })}</div>
    </section>
    {developerOverlay}
    {saleQuestion ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><section className="w-full max-w-lg rounded-[2rem] border-4 border-emerald-900 bg-white p-6 text-kid-ink shadow-2xl"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Customer question</p><h2 className="mt-2 text-2xl font-black">{saleQuestion.prompt}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{saleQuestion.options.map((option) => <KidButton key={option} type="button" variant="secondary" disabled={saleBusy} onClick={() => onSaleAnswer(option)}>{option}</KidButton>)}</div><button type="button" className="mt-5 text-sm font-bold text-slate-500 underline" disabled={saleBusy} onClick={onCloseSale}>Keep the bug for now</button></section></div> : null}
  </main>;
}
