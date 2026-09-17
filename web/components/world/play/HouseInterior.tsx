"use client";

import { HouseRoom } from "@/components/house-designer/HouseRoom";
import { STARTER_HOUSE } from "@/lib/house/house-normalize";
import type { HouseInteriorLayout } from "@/lib/house/house-types";

export function HouseInterior({ layout = STARTER_HOUSE }: { layout?: HouseInteriorLayout }) {
  return <HouseRoom layout={layout} />;
}
