import type { ComponentType } from "react";
import type { HomeSpotId } from "../world-landmasses";
import { HouseCampus } from "./HouseCampus";
import { PetYardCampus } from "./PetYardCampus";
import { SchoolCampus } from "./SchoolCampus";

export { HouseCampus } from "./HouseCampus";
export { SchoolCampus } from "./SchoolCampus";
export { PetYardCampus } from "./PetYardCampus";

export const CAMPUS_COMPONENTS: Record<HomeSpotId, ComponentType> = {
  cottage: HouseCampus,
  school: SchoolCampus,
  pet: PetYardCampus,
};

export const CAMPUS_FILES: Record<HomeSpotId, string> = {
  cottage: "web/components/world/campus/HouseCampus.tsx",
  school: "web/components/world/campus/school/SchoolParts.tsx",
  pet: "web/components/world/campus/PetYardCampus.tsx",
};
