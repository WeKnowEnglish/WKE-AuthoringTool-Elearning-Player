import type { PetMeterId } from "@/lib/pet/types";

export const PET_METER_UI: Record<
  PetMeterId,
  { label: string; fillClass: string; barClass: string }
> = {
  hunger: {
    label: "Hunger",
    fillClass: "stroke-orange-500",
    barClass: "bg-orange-500",
  },
  thirst: {
    label: "Thirst",
    fillClass: "stroke-sky-500",
    barClass: "bg-sky-500",
  },
  energy: {
    label: "Energy",
    fillClass: "stroke-amber-400",
    barClass: "bg-amber-400",
  },
  cleanliness: {
    label: "Clean",
    fillClass: "stroke-teal-500",
    barClass: "bg-teal-500",
  },
  happiness: {
    label: "Happy",
    fillClass: "stroke-pink-500",
    barClass: "bg-pink-500",
  },
};
