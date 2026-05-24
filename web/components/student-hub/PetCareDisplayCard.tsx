"use client";

import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { PetMeterRing } from "@/components/student-hub/PetMeterRing";
import {
  PET_CARE_PET_DISPLAY_SCALE,
  PET_CARE_PET_LAYOUT,
} from "@/lib/pet/animated-pet";
import { PET_METER_IDS } from "@/lib/pet/types";
import type { PetMood, PetSnapshotV1 } from "@/lib/pet/types";

type Props = {
  snapshot: PetSnapshotV1;
  mood: PetMood;
  moodLine: string | null;
  showPet: boolean;
};

export function PetCareDisplayCard({ snapshot, mood, moodLine, showPet }: Props) {
  return (
    <KidPanel className="overflow-visible p-3 sm:p-4">
      <div className="flex items-stretch gap-3 sm:gap-4">
        <div
          className="flex shrink-0 flex-col justify-center gap-2 py-1 sm:gap-2.5"
          aria-label="Pet needs"
        >
          {PET_METER_IDS.map((id) => (
            <PetMeterRing key={id} meterId={id} value={snapshot.meters[id]} />
          ))}
        </div>

        <div className="flex min-h-[14rem] min-w-0 flex-1 flex-col items-center justify-end overflow-visible sm:min-h-[16rem]">
          <div
            className="pointer-events-none"
            style={{
              transform: `translate(${PET_CARE_PET_LAYOUT.translateXPx}px, ${PET_CARE_PET_LAYOUT.translateYPx}px)`,
            }}
          >
            <AnimatedPet
              mood={mood}
              size="xl"
              show={showPet}
              displayScale={PET_CARE_PET_DISPLAY_SCALE}
              displayAnchor="bottom"
            />
          </div>
          {moodLine && showPet ?
            <p className="mt-1 max-w-[14rem] text-center text-xs font-bold text-kid-ink/90 sm:text-sm">
              {moodLine}
            </p>
          : null}
        </div>
      </div>
    </KidPanel>
  );
}
