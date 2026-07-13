import "server-only";

import type { LiveGameSessionState } from "@/lib/live-game/liveblocks/config";
import {
  DEFAULT_LIVE_GAME_QUESTION_SET_UUID,
  resolveQuestionSetUuid,
} from "@/lib/live-game/question-banks/question-set-ids";
import { getQuestionSetVersion } from "@/lib/live-game/server/question-set-resolver";

export type SessionQuestionSetBinding = {
  /** Slug or uuid — resolver accepts both */
  ref: string;
  /** Canonical set uuid */
  setId: string;
  /** Frozen at room create */
  version: number;
};

export class HostQuestionSetInvalidError extends Error {
  constructor(readonly input: string) {
    super(`Unknown question set: ${input}`);
    this.name = "HostQuestionSetInvalidError";
  }
}

function resolveSetId(ref: string): string {
  return resolveQuestionSetUuid(ref) ?? ref;
}

export function readSessionQuestionSetBinding(
  session: Pick<LiveGameSessionState, "questionSetId" | "questionSetVersion">,
): SessionQuestionSetBinding {
  const ref = session.questionSetId;
  return {
    ref,
    setId: resolveSetId(ref),
    version: session.questionSetVersion,
  };
}

function resolveHostQuestionSetRef(inputRef: string | undefined): string {
  const trimmed = inputRef?.trim();
  if (!trimmed) return DEFAULT_LIVE_GAME_QUESTION_SET_UUID;
  const uuid = resolveQuestionSetUuid(trimmed);
  if (uuid) return uuid;
  throw new HostQuestionSetInvalidError(trimmed);
}

export async function resolveHostQuestionSetBinding(
  inputRef: string | undefined,
): Promise<SessionQuestionSetBinding> {
  const ref = resolveHostQuestionSetRef(inputRef);
  const setId = resolveSetId(ref);
  const version = await getQuestionSetVersion(ref);
  return {
    ref: setId,
    setId,
    version,
  };
}
