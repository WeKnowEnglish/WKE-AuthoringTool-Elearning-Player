/** Pure VirtualClassroom group maker logic (session-scoped). */

export type GroupSizeMode = "pairs" | "3" | "4" | "5" | "n_groups";

export type SessionGroup = {
  id: string;
  name: string;
  memberIds: string[];
  leaderId: string | null;
  locked: boolean;
  color: string;
};

export type GroupSetState = {
  sizeMode: GroupSizeMode;
  targetGroupCount: number | null;
  groups: SessionGroup[];
  previousGroups: SessionGroup[] | null;
};

function normalizeSessionGroup(value: unknown): SessionGroup | null {
  if (!value || typeof value !== "object") return null;
  const group = value as Partial<SessionGroup>;
  if (
    typeof group.id !== "string" ||
    typeof group.name !== "string" ||
    !Array.isArray(group.memberIds) ||
    !group.memberIds.every((id) => typeof id === "string") ||
    (group.leaderId !== null && typeof group.leaderId !== "string") ||
    typeof group.locked !== "boolean" ||
    typeof group.color !== "string"
  ) {
    return null;
  }
  return group as SessionGroup;
}

export function normalizeGroupSetState(value: unknown): GroupSetState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<GroupSetState>;
  const modes: GroupSizeMode[] = ["pairs", "3", "4", "5", "n_groups"];
  if (
    !state.sizeMode ||
    !modes.includes(state.sizeMode) ||
    (state.targetGroupCount !== null &&
      (typeof state.targetGroupCount !== "number" || !Number.isInteger(state.targetGroupCount))) ||
    !Array.isArray(state.groups) ||
    (state.previousGroups !== null && !Array.isArray(state.previousGroups))
  ) {
    return null;
  }
  const groups = state.groups.map(normalizeSessionGroup);
  const previousGroups = state.previousGroups?.map(normalizeSessionGroup) ?? null;
  if (groups.some((group) => !group) || previousGroups?.some((group) => !group)) return null;
  return {
    sizeMode: state.sizeMode,
    targetGroupCount: state.targetGroupCount,
    groups: groups as SessionGroup[],
    previousGroups: previousGroups as SessionGroup[] | null,
  };
}

const GROUP_COLORS = ["#0f766e", "#1d4ed8", "#b45309", "#be123c", "#7c3aed", "#047857"];

export function createEmptyGroupSet(): GroupSetState {
  return {
    sizeMode: "pairs",
    targetGroupCount: null,
    groups: [],
    previousGroups: null,
  };
}

function groupSizeForMode(mode: GroupSizeMode, studentCount: number, targetGroupCount: number | null): number {
  if (mode === "pairs") return 2;
  if (mode === "3") return 3;
  if (mode === "4") return 4;
  if (mode === "5") return 5;
  const n = Math.max(1, targetGroupCount ?? 2);
  return Math.max(1, Math.ceil(studentCount / n));
}

function shuffleInPlace<T>(items: T[], random: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
}

export function generateRandomGroups(input: {
  studentIds: string[];
  sizeMode: GroupSizeMode;
  targetGroupCount?: number | null;
  random?: () => number;
}): GroupSetState {
  const random = input.random ?? Math.random;
  const studentIds = [...new Set(input.studentIds)];
  if (studentIds.length === 0) {
    return {
      sizeMode: input.sizeMode,
      targetGroupCount: input.targetGroupCount ?? null,
      groups: [],
      previousGroups: null,
    };
  }

  const shuffled = [...studentIds];
  shuffleInPlace(shuffled, random);

  let groups: SessionGroup[] = [];

  if (input.sizeMode === "n_groups") {
    const n = Math.max(1, Math.min(input.targetGroupCount ?? 2, shuffled.length));
    groups = Array.from({ length: n }, (_, i) => ({
      id: `g${i + 1}`,
      name: `Group ${i + 1}`,
      memberIds: [] as string[],
      leaderId: null,
      locked: false,
      color: GROUP_COLORS[i % GROUP_COLORS.length]!,
    }));
    shuffled.forEach((id, index) => {
      groups[index % n]!.memberIds.push(id);
    });
  } else {
    const size = groupSizeForMode(input.sizeMode, shuffled.length, null);
    let gi = 0;
    for (let i = 0; i < shuffled.length; i += size) {
      const memberIds = shuffled.slice(i, i + size);
      groups.push({
        id: `g${gi + 1}`,
        name: `Group ${gi + 1}`,
        memberIds,
        leaderId: memberIds[0] ?? null,
        locked: false,
        color: GROUP_COLORS[gi % GROUP_COLORS.length]!,
      });
      gi += 1;
    }
  }

  for (const g of groups) {
    g.leaderId = g.memberIds[0] ?? null;
  }

  return {
    sizeMode: input.sizeMode,
    targetGroupCount: input.targetGroupCount ?? null,
    groups,
    previousGroups: null,
  };
}

export function saveCurrentAsPrevious(state: GroupSetState): GroupSetState {
  return {
    ...state,
    previousGroups: state.groups.map((g) => ({
      ...g,
      memberIds: [...g.memberIds],
    })),
  };
}

export function restorePreviousGroups(state: GroupSetState): GroupSetState {
  if (!state.previousGroups?.length) return state;
  return {
    ...state,
    groups: state.previousGroups.map((g) => ({
      ...g,
      memberIds: [...g.memberIds],
    })),
  };
}

export function moveStudentBetweenGroups(
  state: GroupSetState,
  studentId: string,
  toGroupId: string,
): GroupSetState {
  const groups = state.groups.map((g) => ({
    ...g,
    memberIds: g.memberIds.filter((id) => id !== studentId),
  }));
  const target = groups.find((g) => g.id === toGroupId);
  if (!target || target.locked) return state;
  target.memberIds = [...target.memberIds, studentId];
  if (!target.leaderId) target.leaderId = studentId;
  for (const g of groups) {
    if (g.leaderId && !g.memberIds.includes(g.leaderId)) {
      g.leaderId = g.memberIds[0] ?? null;
    }
  }
  return { ...state, groups };
}

export function renameGroup(state: GroupSetState, groupId: string, name: string): GroupSetState {
  return {
    ...state,
    groups: state.groups.map((g) =>
      g.id === groupId ? { ...g, name: name.trim().slice(0, 40) || g.name } : g,
    ),
  };
}

export function setGroupLeader(
  state: GroupSetState,
  groupId: string,
  leaderId: string,
): GroupSetState {
  return {
    ...state,
    groups: state.groups.map((g) => {
      if (g.id !== groupId) return g;
      if (!g.memberIds.includes(leaderId)) return g;
      return { ...g, leaderId };
    }),
  };
}

export function toggleGroupLock(state: GroupSetState, groupId: string): GroupSetState {
  return {
    ...state,
    groups: state.groups.map((g) => (g.id === groupId ? { ...g, locked: !g.locked } : g)),
  };
}

export function shuffleUnlockedGroups(
  state: GroupSetState,
  studentIds: string[],
  random: () => number = Math.random,
): GroupSetState {
  const locked = state.groups.filter((g) => g.locked);
  const lockedMemberIds = new Set(locked.flatMap((g) => g.memberIds));
  const movable = studentIds.filter((id) => !lockedMemberIds.has(id));
  const unlockedCount = Math.max(1, state.groups.filter((g) => !g.locked).length || 1);

  const regenerated = generateRandomGroups({
    studentIds: movable,
    sizeMode: state.sizeMode === "n_groups" ? "n_groups" : state.sizeMode,
    targetGroupCount:
      state.sizeMode === "n_groups" ? unlockedCount : state.targetGroupCount,
    random,
  });

  // Keep locked groups; replace unlocked with regenerated.
  const nextUnlocked = regenerated.groups;
  const merged: SessionGroup[] = [...locked];
  for (const g of nextUnlocked) {
    merged.push({
      ...g,
      id: `g${merged.length + 1}`,
      name: `Group ${merged.length + 1}`,
      color: GROUP_COLORS[merged.length % GROUP_COLORS.length]!,
    });
  }
  return { ...state, groups: merged };
}

export function toWhiteboardAssignPayload(groups: SessionGroup[]): {
  id: string;
  name: string;
  memberIds: string[];
}[] {
  return groups
    .filter((g) => g.memberIds.length > 0)
    .map((g) => ({
      id: g.id,
      name: g.name,
      memberIds: [...g.memberIds],
    }));
}
