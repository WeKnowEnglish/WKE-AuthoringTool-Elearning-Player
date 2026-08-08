/**
 * Shared classroom picker (without-replacement draws + cycles).
 * Items are opaque string ids — student user ids in VC, or freeform labels in the teacher toolkit.
 */

export type PickerMode = "one" | "two" | "presenter";

export type StudentPickerState = {
  availableStudentIds: string[];
  pickedStudentIds: string[];
  excludedStudentIds: string[];
  currentStudentIds: string[];
  cycleNumber: number;
  includeTeacher: boolean;
  mode: PickerMode;
  history: { at: number; studentIds: string[]; mode: PickerMode }[];
};

export function createEmptyPickerState(
  studentIds: string[],
  options?: { includeTeacher?: boolean; mode?: PickerMode },
): StudentPickerState {
  const unique = [...new Set(studentIds)];
  return {
    availableStudentIds: unique,
    pickedStudentIds: [],
    excludedStudentIds: [],
    currentStudentIds: [],
    cycleNumber: 1,
    includeTeacher: options?.includeTeacher ?? false,
    mode: options?.mode ?? "one",
    history: [],
  };
}

export function pickerPool(state: StudentPickerState): string[] {
  return state.availableStudentIds.filter(
    (id) =>
      !state.excludedStudentIds.includes(id) && !state.pickedStudentIds.includes(id),
  );
}

function shuffleInPlace<T>(items: T[], random: () => number): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
}

export function pickStudents(
  state: StudentPickerState,
  options?: { count?: number; random?: () => number },
): StudentPickerState {
  const random = options?.random ?? Math.random;
  const count =
    options?.count ??
    (state.mode === "two" ? 2 : 1);

  let pool = pickerPool(state);
  let nextPicked = [...state.pickedStudentIds];
  let cycleNumber = state.cycleNumber;
  let available = [...state.availableStudentIds];

  if (pool.length === 0) {
    // New cycle: everyone (except excluded) becomes available again.
    nextPicked = [];
    cycleNumber += 1;
    pool = available.filter((id) => !state.excludedStudentIds.includes(id));
  }

  if (pool.length === 0) {
    return { ...state, currentStudentIds: [] };
  }

  const drawCount = Math.min(count, pool.length);
  const shuffled = [...pool];
  shuffleInPlace(shuffled, random);
  const chosen = shuffled.slice(0, drawCount);

  nextPicked = [...nextPicked, ...chosen];
  const history = [
    { at: Date.now(), studentIds: chosen, mode: state.mode },
    ...state.history,
  ].slice(0, 40);

  return {
    ...state,
    availableStudentIds: available,
    pickedStudentIds: nextPicked,
    currentStudentIds: chosen,
    cycleNumber,
    history,
  };
}

export function resetPickerCycle(state: StudentPickerState): StudentPickerState {
  return {
    ...state,
    pickedStudentIds: [],
    currentStudentIds: [],
    cycleNumber: state.cycleNumber + 1,
  };
}

export function setPickerExcluded(
  state: StudentPickerState,
  excludedStudentIds: string[],
): StudentPickerState {
  const excluded = [...new Set(excludedStudentIds)];
  return {
    ...state,
    excludedStudentIds: excluded,
    availableStudentIds: state.availableStudentIds,
    pickedStudentIds: state.pickedStudentIds.filter((id) => !excluded.includes(id)),
    currentStudentIds: state.currentStudentIds.filter((id) => !excluded.includes(id)),
  };
}

export function syncPickerRoster(
  state: StudentPickerState | null,
  studentIds: string[],
): StudentPickerState {
  const unique = [...new Set(studentIds)];
  if (!state) return createEmptyPickerState(unique);
  const excluded = state.excludedStudentIds.filter((id) => unique.includes(id));
  const picked = state.pickedStudentIds.filter(
    (id) => unique.includes(id) && !excluded.includes(id),
  );
  return {
    ...state,
    availableStudentIds: unique,
    excludedStudentIds: excluded,
    pickedStudentIds: picked,
    currentStudentIds: state.currentStudentIds.filter((id) => unique.includes(id)),
  };
}
