import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  asLiveGameMutatorRoot,
  readMutatorString,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export type LiveGameObjectiveKind = "boat_escape";

export type CompleteObjectiveResult = {
  objectiveCompleted: boolean;
  victoryAt: number;
  completedByPlayerId: string;
  alreadyCompleted: boolean;
  kind: LiveGameObjectiveKind;
};

function readMutatorBoolean(value: unknown): boolean {
  return value === true;
}

export async function completeLiveGameObjective(input: {
  roomId: string;
  playerId: string;
  kind?: LiveGameObjectiveKind;
}): Promise<CompleteObjectiveResult | null> {
  const kind = input.kind ?? "boat_escape";
  const liveblocks = getLiveblocksServerClient();
  let result: CompleteObjectiveResult | null = null;

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const session = storage.get("session");
    if (!session) return;

    const phase = session.get("phase");
    if (phase === "completed") {
      result = {
        objectiveCompleted: readMutatorBoolean(session.get("objectiveCompleted")),
        victoryAt: typeof session.get("victoryAt") === "number" ? (session.get("victoryAt") as number) : Date.now(),
        completedByPlayerId: readMutatorString(session.get("completedByPlayerId")) ?? input.playerId,
        alreadyCompleted: true,
        kind,
      };
      return;
    }

    if (phase !== "playing") return;

    const unlockedObjects = storage.get("unlockedObjects") as LiveGameMutatorNode | undefined;
    if (!unlockedObjects) return;

    if (kind === "boat_escape") {
      if (!readMutatorBoolean(unlockedObjects.get("boat_boarding"))) return;
    } else {
      return;
    }

    const victoryAt = Date.now();
    session.set("phase", "completed");
    session.set("objectiveCompleted", true);
    session.set("victoryAt", victoryAt);
    session.set("completedByPlayerId", input.playerId);

    result = {
      objectiveCompleted: true,
      victoryAt,
      completedByPlayerId: input.playerId,
      alreadyCompleted: false,
      kind,
    };
  });

  return result;
}
