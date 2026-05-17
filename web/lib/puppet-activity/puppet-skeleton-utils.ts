import { DEFAULT_PUPPET_SKELETON, type SkeletonBoneNode } from "./puppet-skeleton";
import { PUPPET_PART_KEYS, type PuppetPartKey } from "./types";

/** `null` = root; every part in a complete rig appears once. */
export type SkeletonParentMap = Record<PuppetPartKey, PuppetPartKey | null>;

export function cloneSkeletonNode(node: SkeletonBoneNode): SkeletonBoneNode {
  return {
    part: node.part,
    children: node.children?.map(cloneSkeletonNode),
  };
}

export function skeletonToParentMap(root: SkeletonBoneNode): SkeletonParentMap {
  const map = {} as SkeletonParentMap;
  function walk(node: SkeletonBoneNode, parent: PuppetPartKey | null) {
    map[node.part] = parent;
    for (const child of node.children ?? []) {
      walk(child, node.part);
    }
  }
  walk(root, null);
  for (const part of PUPPET_PART_KEYS) {
    if (!(part in map)) map[part] = null;
  }
  return map;
}

export function defaultSkeletonParentMap(): SkeletonParentMap {
  return skeletonToParentMap(DEFAULT_PUPPET_SKELETON);
}

export function skeletonFromParentMap(map: SkeletonParentMap): SkeletonBoneNode | null {
  const root = PUPPET_PART_KEYS.find((p) => map[p] === null);
  if (!root) return null;

  function build(part: PuppetPartKey): SkeletonBoneNode {
    const children = PUPPET_PART_KEYS.filter((p) => map[p] === part);
    return {
      part,
      children: children.length > 0 ? children.map(build) : undefined,
    };
  }

  return build(root);
}

export function isRoot(map: SkeletonParentMap, part: PuppetPartKey): boolean {
  return map[part] === null;
}

export function getRootPart(map: SkeletonParentMap): PuppetPartKey | null {
  return PUPPET_PART_KEYS.find((p) => map[p] === null) ?? null;
}

/** True if `maybeAncestor` is on the path from `part` to the root. */
export function isAncestorOf(
  map: SkeletonParentMap,
  maybeAncestor: PuppetPartKey,
  part: PuppetPartKey,
): boolean {
  let cur: PuppetPartKey | null = map[part] ?? null;
  while (cur !== null) {
    if (cur === maybeAncestor) return true;
    cur = map[cur];
  }
  return false;
}

export function wouldCreateCycle(
  map: SkeletonParentMap,
  child: PuppetPartKey,
  parent: PuppetPartKey,
): boolean {
  return child === parent || isAncestorOf(map, child, parent);
}

/** Reparent `child` under `parent` (`null` = make root). */
export function setBoneParent(
  map: SkeletonParentMap,
  child: PuppetPartKey,
  parent: PuppetPartKey | null,
): SkeletonParentMap {
  if (parent !== null && wouldCreateCycle(map, child, parent)) {
    return map;
  }

  const next: SkeletonParentMap = { ...map, [child]: parent };

  if (parent === null) {
    const oldRoot = getRootPart(map);
    if (oldRoot && oldRoot !== child) {
      next[oldRoot] = child;
    }
    return next;
  }

  return next;
}

/**
 * Stage / editor: attach `part` under `activeParent` when selecting a new part.
 * Skips reparenting the skeleton root so body stays root when re-selected.
 */
export function attachPartToActiveParent(
  map: SkeletonParentMap,
  part: PuppetPartKey,
  activeParent: PuppetPartKey | null,
): SkeletonParentMap {
  if (activeParent === null || activeParent === part) return map;
  const root = getRootPart(map);
  if (isRoot(map, part) && root === part) return map;
  return setBoneParent(map, part, activeParent);
}

export function validateParentMap(map: SkeletonParentMap): {
  ok: boolean;
  error?: string;
} {
  const roots = PUPPET_PART_KEYS.filter((p) => map[p] === null);
  if (roots.length !== 1) {
    return { ok: false, error: `Expected 1 root, found ${roots.length}` };
  }
  for (const part of PUPPET_PART_KEYS) {
    if (!(part in map)) {
      return { ok: false, error: `Missing parent for ${part}` };
    }
    const parent = map[part];
    if (parent !== null && !PUPPET_PART_KEYS.includes(parent)) {
      return { ok: false, error: `Invalid parent for ${part}` };
    }
  }
  const tree = skeletonFromParentMap(map);
  if (!tree) return { ok: false, error: "Could not build tree" };
  return { ok: true };
}

export function formatSkeletonJson(root: SkeletonBoneNode): string {
  return JSON.stringify(root, null, 2);
}

export type SkeletonEdge = {
  parent: PuppetPartKey;
  child: PuppetPartKey;
};

export function parentMapToEdges(map: SkeletonParentMap): SkeletonEdge[] {
  const edges: SkeletonEdge[] = [];
  for (const part of PUPPET_PART_KEYS) {
    const parent = map[part];
    if (parent !== null) {
      edges.push({ parent, child: part });
    }
  }
  return edges;
}

/** Remove parent link for `child` (child becomes root; prior root is re-parented under child). */
export function clearBoneParent(
  map: SkeletonParentMap,
  child: PuppetPartKey,
): SkeletonParentMap {
  return setBoneParent(map, child, null);
}

export function formatSkeletonForSource(root: SkeletonBoneNode): string {
  function formatNode(node: SkeletonBoneNode, indent: string): string {
    if (!node.children?.length) {
      return `${indent}{ part: "${node.part}" }`;
    }
    const childLines = node.children.map((c) => formatNode(c, `${indent}  `)).join(",\n");
    return `${indent}{\n${indent}  part: "${node.part}",\n${indent}  children: [\n${childLines},\n${indent}  ],\n${indent}}`;
  }
  return `export const DEFAULT_PUPPET_SKELETON: SkeletonBoneNode = ${formatNode(root, "")};`;
}
