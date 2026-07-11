import Link from "next/link";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";

export default function LiveGamePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <KidPanel className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-kid-ink">Live Game</h1>
          <p className="mt-1 text-sm font-semibold text-kid-ink/70">
            Disposable classroom sessions — play together, then the room closes.
          </p>
          <p className="mt-2 text-sm font-semibold text-kid-ink/80">
            First mode: <strong>{ENGLISH_CRAFT_MODE.title}</strong>
          </p>
        </div>

        <Link
          href="/live-game/host"
          className="block rounded-xl border-4 border-kid-ink bg-kid-cta px-4 py-3 text-center text-lg font-extrabold text-kid-ink"
        >
          Host a game (teacher)
        </Link>

        <Link
          href="/live-game/join"
          className="block rounded-xl border-4 border-kid-ink bg-kid-surface px-4 py-3 text-center text-lg font-extrabold text-kid-ink"
        >
          Join with code (student)
        </Link>
      </KidPanel>
    </div>
  );
}
