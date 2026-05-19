import { DEFAULT_AVATAR_LOADOUT } from "@/lib/avatar/defaults";
import {
  robotGrowthGroupId,
  robotGrowthStage,
  type RobotGrowthStage,
} from "@/lib/avatar/growth";
import type { AvatarLoadout, AvatarPresetId, AvatarSlot } from "@/lib/avatar/types";

export type ApplyAvatarOptions = {
  presetId?: AvatarPresetId | null;
  playerLevel?: number;
};

const STANDARD_FIGURE_ROOT_IDS = [
  "body",
  "face",
  "slot-bottom",
  "slot-shoes",
  "slot-top",
  "slot-hair",
  "slot-hat",
  "slot-accessory",
] as const;

export const STUDENT_AVATAR_SVG_PATH = "/avatar/student-avatar.svg";

export function normalizeLoadout(raw: unknown): AvatarLoadout {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_AVATAR_LOADOUT };
  }
  const r = raw as Partial<AvatarLoadout>;
  return {
    skin: typeof r.skin === "string" && r.skin ? r.skin : DEFAULT_AVATAR_LOADOUT.skin,
    hair: typeof r.hair === "string" && r.hair ? r.hair : DEFAULT_AVATAR_LOADOUT.hair,
    top: typeof r.top === "string" && r.top ? r.top : DEFAULT_AVATAR_LOADOUT.top,
    bottom:
      typeof r.bottom === "string" && r.bottom ? r.bottom : DEFAULT_AVATAR_LOADOUT.bottom,
    shoes: typeof r.shoes === "string" && r.shoes ? r.shoes : DEFAULT_AVATAR_LOADOUT.shoes,
    hat: r.hat === null || (typeof r.hat === "string" && r.hat) ? r.hat : null,
    accessory:
      r.accessory === null || (typeof r.accessory === "string" && r.accessory) ?
        r.accessory
      : null,
  };
}

/** SVG group id for a slot item, e.g. `item-top-fox`. */
export function itemGroupId(slot: AvatarSlot, itemId: string): string {
  return `item-${slot}-${itemId}`;
}

/** Which `item-{slot}-*` group should be visible per slot. */
export function resolveEquippedGroupIds(loadout: AvatarLoadout): Record<AvatarSlot, string | null> {
  return {
    hair: itemGroupId("hair", loadout.hair),
    top: itemGroupId("top", loadout.top),
    bottom: itemGroupId("bottom", loadout.bottom),
    shoes: itemGroupId("shoes", loadout.shoes),
    hat: loadout.hat ? itemGroupId("hat", loadout.hat) : null,
    accessory:
      loadout.accessory ? itemGroupId("accessory", loadout.accessory) : "item-accessory-none",
  };
}

const FACE_REPLACING_ACCESSORIES = new Set(["fox-snout", "alien-face"]);

export function shouldHideBaseFace(loadout: AvatarLoadout): boolean {
  return loadout.accessory !== null && FACE_REPLACING_ACCESSORIES.has(loadout.accessory);
}

function setGroupDisplay(el: Element | null, show: boolean) {
  if (!el) return;
  const node = el as SVGElement;
  node.style.display = show ? "" : "none";
  if (show) node.removeAttribute("hidden");
  else node.setAttribute("hidden", "");
}

function hideRobotGrowth(svg: SVGSVGElement) {
  const slot = svg.querySelector("#slot-robot-growth");
  setGroupDisplay(slot, false);
  if (slot) {
    slot.querySelectorAll(':scope > g[id^="item-robot-growth-"]').forEach((node) => {
      setGroupDisplay(node, false);
    });
  }
  for (const id of STANDARD_FIGURE_ROOT_IDS) {
    setGroupDisplay(svg.querySelector(`#${id}`), true);
  }
}

function applyRobotGrowthToSvg(svg: SVGSVGElement, stage: RobotGrowthStage): void {
  svg.setAttribute("data-skin", "cool");
  for (const id of STANDARD_FIGURE_ROOT_IDS) {
    setGroupDisplay(svg.querySelector(`#${id}`), false);
  }
  const slot = svg.querySelector("#slot-robot-growth");
  setGroupDisplay(slot, true);
  if (!slot) return;
  const targetId = robotGrowthGroupId(stage);
  slot.querySelectorAll(':scope > g[id^="item-robot-growth-"]').forEach((node) => {
    setGroupDisplay(node, node.id === targetId);
  });
}

export function applyLoadoutToSvgRoot(
  svg: SVGSVGElement,
  loadout: AvatarLoadout,
  options?: ApplyAvatarOptions,
): void {
  const preset = options?.presetId ?? null;
  const playerLevel = options?.playerLevel ?? 1;

  if (preset === "robot") {
    applyRobotGrowthToSvg(svg, robotGrowthStage(playerLevel));
    return;
  }

  hideRobotGrowth(svg);

  const equipped = resolveEquippedGroupIds(loadout);
  svg.setAttribute("data-skin", loadout.skin);

  const face = svg.querySelector("#face");
  if (face) {
    const hide = shouldHideBaseFace(loadout);
    (face as SVGElement).style.display = hide ? "none" : "";
    if (hide) face.setAttribute("hidden", "");
    else face.removeAttribute("hidden");
  }

  for (const slot of ["hair", "top", "bottom", "shoes", "hat", "accessory"] as const) {
    const slotRoot = svg.querySelector(`#slot-${slot}`);
    if (!slotRoot) continue;
    const targetId = equipped[slot];
    const items = slotRoot.querySelectorAll(':scope > g[id^="item-"]');
    items.forEach((node) => {
      const el = node as SVGGElement;
      const show = targetId !== null && el.id === targetId;
      el.style.display = show ? "" : "none";
      if (show) {
        el.removeAttribute("hidden");
      } else {
        el.setAttribute("hidden", "");
      }
    });
  }
}

export function avatarAriaLabel(
  loadout: AvatarLoadout,
  options?: ApplyAvatarOptions,
): string {
  if (options?.presetId === "robot") {
    const stage = robotGrowthStage(options.playerLevel ?? 1);
    return `Robot avatar, growth stage ${stage}`;
  }
  const parts = [
    loadout.top !== "default" ? `${loadout.top} top` : null,
    loadout.hair !== "default" ? `${loadout.hair} hair` : null,
    loadout.hat ? `${loadout.hat} hat` : null,
    loadout.accessory ? `${loadout.accessory}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return "Student avatar";
  return `Student avatar, ${parts.join(", ")}`;
}
