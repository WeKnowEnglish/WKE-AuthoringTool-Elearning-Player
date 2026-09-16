"use client";

import { useMemo } from "react";
import { Vector3 } from "three";
import { BuoyKit } from "./landmark-kits";
import { SurfaceLandmark } from "./SurfaceLandmark";
import { latLonToNormal } from "./sphere-wrap";
import { landmassById } from "./world-landmasses";

const COLORS = ["#f43f5e", "#fbbf24", "#38bdf8"];

function hopsBetween(from: Vector3, to: Vector3, count: number, radius: number): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 1; i <= count; i += 1) {
    const t = i / (count + 1);
    const point = from.clone().lerp(to, t).normalize().multiplyScalar(radius);
    points.push(point);
  }
  return points;
}

function toLatLon(point: Vector3): { lat: number; lon: number } {
  return {
    lat: (Math.asin(point.y) * 180) / Math.PI,
    lon: (Math.atan2(point.x, point.z) * 180) / Math.PI,
  };
}

export function JourneyCrumbs() {
  const crumbs = useMemo(() => {
    const home = landmassById("home");
    const reading = landmassById("reading-shore");
    const games = landmassById("games-harbor");
    const adventure = landmassById("adventure-mainland");
    if (!home || !reading || !games || !adventure) return [];

    const homeN = latLonToNormal(home.lat, home.lon);
    const readingN = latLonToNormal(reading.lat, reading.lon);
    const gamesN = latLonToNormal(games.lat, games.lon);
    const adventureN = latLonToNormal(adventure.lat, adventure.lon);

    return [
      ...hopsBetween(homeN, readingN, 3, 1.035).map((point, index) => ({
        ...toLatLon(point),
        color: COLORS[index % COLORS.length],
        key: `read-${index}`,
      })),
      ...hopsBetween(homeN, gamesN, 3, 1.035).map((point, index) => ({
        ...toLatLon(point),
        color: COLORS[(index + 1) % COLORS.length],
        key: `games-${index}`,
      })),
      ...hopsBetween(homeN, adventureN, 3, 1.04).map((point, index) => ({
        ...toLatLon(point),
        color: COLORS[(index + 2) % COLORS.length],
        key: `adv-${index}`,
      })),
    ];
  }, []);

  return (
    <group name="journey-crumbs">
      {crumbs.map((crumb) => (
        <SurfaceLandmark
          key={crumb.key}
          lat={crumb.lat}
          lon={crumb.lon}
          radius={1.035}
          scale={0.16}
          name={`crumb-${crumb.key}`}
        >
          <BuoyKit color={crumb.color} />
        </SurfaceLandmark>
      ))}
    </group>
  );
}
