import type { LandmassKind } from "./island-shape";

export type WorldZoneId = "home";
export type LandmarkKind = "cottage";
export type HomeSpotId = "cottage" | "school" | "pet";

export type WorldZone = {
  id: WorldZoneId;
  label: string;
  shortLabel: string;
  blurb: string;
  href: string | null;
  ctaLabel: string | null;
  journeyOrder: 1;
};

export type WorldLandmass = {
  id: string;
  kind: LandmassKind;
  zone: WorldZoneId;
  label: string;
  biome?: string;
  locked?: boolean;
  landmark?: LandmarkKind;
  hub?: boolean;
  lat: number;
  lon: number;
  yaw: number;
  unitsToRadians: number;
  grid: number;
  extent: number;
  shelfRadius: number;
  /** Authored XZ of the house the camera should crown when this hub is focused. */
  focusX?: number;
  focusZ?: number;
};

export const WORLD_ZONES: Record<WorldZoneId, WorldZone> = {
  home: {
    id: "home",
    label: "Home",
    shortLabel: "Home",
    blurb: "Your house, school, and pet live here.",
    href: "/primary",
    ctaLabel: "Go to class",
    journeyOrder: 1,
  },
};

export const WORLD_LANDMASSES: WorldLandmass[] = [
  {
    id: "home",
    kind: "home",
    zone: "home",
    label: "Home",
    landmark: "cottage",
    hub: true,
    lat: -2,
    lon: 0,
    yaw: 0.85,
    unitsToRadians: 0.78,
    grid: 108,
    extent: 1.98,
    shelfRadius: 0.74,
    focusX: 0.064,
    focusZ: -0.459,
  },
];

export const WORLD_HUBS = WORLD_LANDMASSES.filter((landmass) => landmass.hub);

export function hubForZone(zone: WorldZoneId): WorldLandmass | undefined {
  return WORLD_HUBS.find((landmass) => landmass.zone === zone);
}

export function landmassById(id: string): WorldLandmass | undefined {
  return WORLD_LANDMASSES.find((landmass) => landmass.id === id);
}

export function zoneHref(landmass: WorldLandmass): string | null {
  if (landmass.locked) return null;
  return WORLD_ZONES[landmass.zone].href;
}

export type WorldSelection = {
  landmassId: string;
  zone: WorldZoneId;
  label: string;
  biome?: string;
  locked: boolean;
  href: string | null;
  ctaLabel: string | null;
  blurb: string;
  journeyOrder: 1;
  spot?: HomeSpotId;
  lookLat?: number;
  lookLon?: number;
};

export const HOME_LOCALS: Record<HomeSpotId, { localX: number; localZ: number; yaw?: number }> = {
  cottage: { localX: 0.064, localZ: -0.459, yaw: -0.262 },
  school: { localX: 0.3, localZ: 0.12, yaw: -0.25 },
  pet: { localX: -0.28, localZ: 0.12, yaw: 0.35 },
};

const HOME_SPOTS: Record<HomeSpotId, { label: string; blurb: string; href: string; ctaLabel: string }> = {
  cottage: {
    label: "Your house",
    blurb: "Walk the yard, then peek inside. The fridge is waiting.",
    href: "/primary/world/play/cottage",
    ctaLabel: "Walk around",
  },
  school: {
    label: "School",
    blurb: "Walk the yard, then go into the classroom.",
    href: "/primary/world/play/school",
    ctaLabel: "Walk around",
  },
  pet: {
    label: "Pet yard",
    blurb: "Your pet lives here.",
    href: "/primary?nav=games",
    ctaLabel: "See your pet",
  },
};

export const HOME_NAV: Array<{ spot: HomeSpotId; shortLabel: string }> = [
  { spot: "cottage", shortLabel: "House" },
  { spot: "school", shortLabel: "School" },
  { spot: "pet", shortLabel: "Pet" },
];

export function homeSpotLabel(spot: HomeSpotId): string {
  return HOME_SPOTS[spot].label;
}

function isHomeSpot(value: string | undefined): value is HomeSpotId {
  return value === "cottage" || value === "school" || value === "pet";
}

export function selectionFromLandmass(id: string, spot?: string): WorldSelection | null {
  const landmass = landmassById(id);
  if (!landmass) return null;
  const zone = WORLD_ZONES[landmass.zone];
  const homeSpotId = landmass.zone === "home" && isHomeSpot(spot) ? spot : undefined;
  const homeSpot = homeSpotId ? HOME_SPOTS[homeSpotId] : null;
  return {
    landmassId: landmass.id,
    zone: landmass.zone,
    label: homeSpot?.label ?? landmass.label,
    biome: landmass.biome,
    locked: Boolean(landmass.locked),
    href: homeSpot?.href ?? zoneHref(landmass),
    ctaLabel: landmass.locked ? null : (homeSpot?.ctaLabel ?? zone.ctaLabel),
    journeyOrder: zone.journeyOrder,
    spot: homeSpotId,
    blurb: landmass.locked
      ? "Coming soon."
      : homeSpot
        ? homeSpot.blurb
        : landmass.hub
          ? zone.blurb
          : landmass.biome
            ? `${zone.label} · ${landmass.biome}`
            : zone.blurb,
  };
}

export function oceanLandInfluences(): Array<{ lat: number; lon: number; radius: number; homeWaters: boolean }> {
  return WORLD_LANDMASSES.map((landmass) => ({
    lat: landmass.lat,
    lon: landmass.lon,
    radius: landmass.shelfRadius,
    homeWaters: landmass.zone === "home",
  }));
}
