"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import { LiveGameSessionTimerChip } from "@/components/live-game/LiveGameSessionTimerChip";

type Props = {
  showTimer: boolean;
  timerLabel: string;
  timerUrgent?: boolean;
  onEndSessionClick: () => void;
  endDisabled?: boolean;
  onAddMinute?: () => void;
  addMinuteDisabled?: boolean;
};

export function LiveGameHostPlayHud({
  showTimer,
  timerLabel,
  timerUrgent = false,
  onEndSessionClick,
  endDisabled = false,
  onAddMinute,
  addMinuteDisabled = false,
}: Props) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {showTimer ?
        <LiveGameSessionTimerChip label={timerLabel} urgent={timerUrgent} onClick={onAddMinute} disabled={addMinuteDisabled} />
      : null}
      <KidButton
        type="button"
        variant="secondary"
        className="!min-h-9 !min-w-0 px-3 text-xs font-extrabold"
        disabled={endDisabled}
        onClick={onEndSessionClick}
      >
        End session
      </KidButton>
    </div>
  );
}
