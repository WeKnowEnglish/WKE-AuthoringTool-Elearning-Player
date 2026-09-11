export type ScenarioId =
  | "starting_soon"
  | "live"
  | "just_ended"
  | "midweek"
  | "caught_up"
  | "new_class";

export type StudentPresence = "waiting" | "in_class" | "absent" | "away";

export type StudentFlag = "writing" | "late_hw" | "quiet" | "ready";

export type MockStudent = {
  id: string;
  name: string;
  short: string;
  color: string;
  presence: StudentPresence;
  flag: StudentFlag | null;
  note: string;
};

export type NeedTone = "now" | "soon" | "gentle";

export type NeedPanel = "writing" | "homework" | "lesson" | "schedule" | "stream" | "roster";

export type NeedItem = {
  id: string;
  tone: NeedTone;
  title: string;
  detail: string;
  action: string;
  panel: NeedPanel;
};

export type LessonStep = {
  label: string;
  minutes: number;
  active?: boolean;
  done?: boolean;
};

export type NowKind = "go_live" | "live" | "wrap" | "plan" | "clear" | "invite";

export type Scenario = {
  id: ScenarioId;
  dockLabel: string;
  dockHint: string;
  clock: string;
  weekday: string;
  classTitle: string;
  joinCode: string;
  studentCountLabel: string;
  nextMeeting: string;
  now: {
    kind: NowKind;
    kicker: string;
    title: string;
    body: string;
    because: string;
    primary: string;
    secondary?: string;
  };
  needs: NeedItem[];
  students: MockStudent[];
  lesson: {
    title: string;
    status: string;
    steps: LessonStep[];
  } | null;
  homework: {
    title: string;
    done: number;
    total: number;
    missing: string[];
  } | null;
};

const CLASS = {
  title: "Grade 4 · Meet me",
  joinCode: "MEET4",
};

const STUDENTS = {
  minh: { id: "minh", name: "Minh Tran", short: "MT", color: "#0f766e" },
  linh: { id: "linh", name: "Linh Pham", short: "LP", color: "#6d28d9" },
  an: { id: "an", name: "An Nguyen", short: "AN", color: "#b45309" },
  khoa: { id: "khoa", name: "Khoa Le", short: "KL", color: "#0369a1" },
  mai: { id: "mai", name: "Mai Vu", short: "MV", color: "#be123c" },
  tuan: { id: "tuan", name: "Tuan Bui", short: "TB", color: "#44403c" },
} as const;

const LESSON_MEET_ME: LessonStep[] = [
  { label: "Warm-up · names", minutes: 5 },
  { label: "Language in focus", minutes: 12 },
  { label: "Speaking pairs", minutes: 10 },
  { label: "Wrap + homework", minutes: 8 },
];

export const SCENARIO_ORDER: ScenarioId[] = [
  "starting_soon",
  "live",
  "just_ended",
  "midweek",
  "caught_up",
  "new_class",
];

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  starting_soon: {
    id: "starting_soon",
    dockLabel: "Starting soon",
    dockHint: "Class is 12 minutes away — the page becomes a launch pad.",
    clock: "3:48 PM",
    weekday: "Thursday",
    classTitle: CLASS.title,
    joinCode: CLASS.joinCode,
    studentCountLabel: "6 students",
    nextMeeting: "Today · 4:00–4:45 PM",
    now: {
      kind: "go_live",
      kicker: "In 12 minutes",
      title: "Class is about to start",
      body: "Unit 1 · Meet me is ready. Minh and Linh are already in the waiting room.",
      because: "You ran this plan last week — it’s still the one on the stand.",
      primary: "Start classroom",
      secondary: "Open the plan",
    },
    needs: [
      {
        id: "waiting",
        tone: "now",
        title: "2 waiting",
        detail: "Minh and Linh joined early.",
        action: "Let them in",
        panel: "roster",
      },
      {
        id: "writing",
        tone: "soon",
        title: "2 writing to review",
        detail: "Linh and Khoa sent sentences after Tuesday.",
        action: "Review after class",
        panel: "writing",
      },
    ],
    students: [
      { ...STUDENTS.minh, presence: "waiting", flag: "ready", note: "In the waiting room" },
      { ...STUDENTS.linh, presence: "waiting", flag: "writing", note: "Waiting · 2 sentences unread" },
      { ...STUDENTS.an, presence: "away", flag: "late_hw", note: "Homework still open" },
      { ...STUDENTS.khoa, presence: "away", flag: "writing", note: "Not in yet" },
      { ...STUDENTS.mai, presence: "away", flag: null, note: "Usually joins at 4:00" },
      { ...STUDENTS.tuan, presence: "away", flag: "quiet", note: "Missed last Thursday" },
    ],
    lesson: {
      title: "Unit 1 · Meet me",
      status: "Ready to teach",
      steps: LESSON_MEET_ME.map((step, index) => ({ ...step, active: index === 0 })),
    },
    homework: {
      title: "Introduce yourself — 4 sentences",
      done: 4,
      total: 6,
      missing: ["An Nguyen", "Tuan Bui"],
    },
  },

  live: {
    id: "live",
    dockLabel: "Live now",
    dockHint: "During class the hub becomes a cockpit: who’s in, what’s next, tools at hand.",
    clock: "4:11 PM",
    weekday: "Thursday",
    classTitle: CLASS.title,
    joinCode: CLASS.joinCode,
    studentCountLabel: "4 in the room",
    nextMeeting: "Live · 4:00–4:45 PM",
    now: {
      kind: "live",
      kicker: "Live · 11 minutes in",
      title: "You’re in class",
      body: "4 of 6 students are with you. Current step: Language in focus.",
      because: "Tuan is absent again — the page keeps him visible so he doesn’t vanish after class.",
      primary: "Open classroom",
      secondary: "End class",
    },
    needs: [
      {
        id: "an-late",
        tone: "now",
        title: "An hasn’t joined",
        detail: "Waiting room is empty. Homework still missing.",
        action: "Nudge",
        panel: "roster",
      },
      {
        id: "next-step",
        tone: "soon",
        title: "Speaking pairs next",
        detail: "About 8 minutes left on this step.",
        action: "Advance plan",
        panel: "lesson",
      },
    ],
    students: [
      { ...STUDENTS.minh, presence: "in_class", flag: "ready", note: "Camera on · unmuted" },
      { ...STUDENTS.linh, presence: "in_class", flag: "writing", note: "In class" },
      { ...STUDENTS.an, presence: "away", flag: "late_hw", note: "Not in yet" },
      { ...STUDENTS.khoa, presence: "in_class", flag: null, note: "In class" },
      { ...STUDENTS.mai, presence: "in_class", flag: null, note: "In class" },
      { ...STUDENTS.tuan, presence: "absent", flag: "quiet", note: "Didn’t join" },
    ],
    lesson: {
      title: "Unit 1 · Meet me",
      status: "On step 2 of 4",
      steps: LESSON_MEET_ME.map((step, index) => ({
        ...step,
        done: index === 0,
        active: index === 1,
      })),
    },
    homework: {
      title: "Introduce yourself — 4 sentences",
      done: 4,
      total: 6,
      missing: ["An Nguyen", "Tuan Bui"],
    },
  },

  just_ended: {
    id: "just_ended",
    dockLabel: "Just ended",
    dockHint: "The first five minutes after class are when teachers actually close the loop.",
    clock: "4:47 PM",
    weekday: "Thursday",
    classTitle: CLASS.title,
    joinCode: CLASS.joinCode,
    studentCountLabel: "6 students",
    nextMeeting: "Next · Tuesday 4:00 PM",
    now: {
      kind: "wrap",
      kicker: "Class just ended",
      title: "Two things before you go",
      body: "Linh and Khoa sent writing. Tuan missed again. Homework for Tuesday isn’t assigned yet.",
      because: "You usually assign homework before leaving the page — it still isn’t out.",
      primary: "Review writing",
      secondary: "Assign Tuesday homework",
    },
    needs: [
      {
        id: "writing",
        tone: "now",
        title: "2 sentences waiting",
        detail: "Linh and Khoa · Introduce yourself",
        action: "Review now",
        panel: "writing",
      },
      {
        id: "tuan",
        tone: "now",
        title: "Tuan was absent",
        detail: "Second miss this unit. Parents haven’t been posted to.",
        action: "Post a note",
        panel: "stream",
      },
      {
        id: "hw",
        tone: "soon",
        title: "Tuesday homework",
        detail: "No assignment is live for the next class.",
        action: "Assign",
        panel: "homework",
      },
    ],
    students: [
      { ...STUDENTS.minh, presence: "away", flag: "ready", note: "Strong today" },
      { ...STUDENTS.linh, presence: "away", flag: "writing", note: "2 sentences to review" },
      { ...STUDENTS.an, presence: "away", flag: "late_hw", note: "Joined late · HW still open" },
      { ...STUDENTS.khoa, presence: "away", flag: "writing", note: "1 sentence to review" },
      { ...STUDENTS.mai, presence: "away", flag: null, note: "Quiet but solid" },
      { ...STUDENTS.tuan, presence: "absent", flag: "quiet", note: "Missed class" },
    ],
    lesson: {
      title: "Unit 1 · Meet me",
      status: "Taught just now",
      steps: LESSON_MEET_ME.map((step) => ({ ...step, done: true })),
    },
    homework: {
      title: "Nothing assigned for Tuesday yet",
      done: 0,
      total: 6,
      missing: [],
    },
  },

  midweek: {
    id: "midweek",
    dockLabel: "Midweek",
    dockHint: "Between classes the page is a nudge, not a filing cabinet.",
    clock: "11:20 AM",
    weekday: "Wednesday",
    classTitle: CLASS.title,
    joinCode: CLASS.joinCode,
    studentCountLabel: "6 students",
    nextMeeting: "Tomorrow · 4:00 PM",
    now: {
      kind: "plan",
      kicker: "Tomorrow at 4:00",
      title: "Thursday still needs a plan",
      body: "Homework is 4 of 6 in. An is stuck. Tomorrow’s lesson is still a draft.",
      because: "You usually finish the plan on Wednesday mornings.",
      primary: "Finish Thursday’s plan",
      secondary: "Nudge An",
    },
    needs: [
      {
        id: "plan",
        tone: "now",
        title: "Lesson is a draft",
        detail: "Warm-up is set. Speaking pairs is empty.",
        action: "Open plan",
        panel: "lesson",
      },
      {
        id: "an",
        tone: "soon",
        title: "An hasn’t started homework",
        detail: "Due tonight · 0 of 4 sentences.",
        action: "Nudge",
        panel: "homework",
      },
    ],
    students: [
      { ...STUDENTS.minh, presence: "away", flag: "ready", note: "Homework in Monday" },
      { ...STUDENTS.linh, presence: "away", flag: null, note: "Homework in" },
      { ...STUDENTS.an, presence: "away", flag: "late_hw", note: "0 of 4 sentences" },
      { ...STUDENTS.khoa, presence: "away", flag: null, note: "Homework in" },
      { ...STUDENTS.mai, presence: "away", flag: null, note: "Homework in" },
      { ...STUDENTS.tuan, presence: "away", flag: "late_hw", note: "2 of 4 sentences" },
    ],
    lesson: {
      title: "Unit 1 · Session 2 · Family",
      status: "Draft · 1 of 4 steps",
      steps: [
        { label: "Warm-up · family words", minutes: 6, done: true },
        { label: "Language in focus", minutes: 12, active: true },
        { label: "Speaking pairs", minutes: 10 },
        { label: "Wrap + homework", minutes: 8 },
      ],
    },
    homework: {
      title: "Introduce yourself — due tonight",
      done: 4,
      total: 6,
      missing: ["An Nguyen", "Tuan Bui"],
    },
  },

  caught_up: {
    id: "caught_up",
    dockLabel: "Caught up",
    dockHint: "When nothing is on fire, the page should feel calm — and still useful.",
    clock: "7:05 PM",
    weekday: "Sunday",
    classTitle: CLASS.title,
    joinCode: CLASS.joinCode,
    studentCountLabel: "6 students",
    nextMeeting: "Friday · 4:00 PM",
    now: {
      kind: "clear",
      kicker: "You’re clear",
      title: "Nothing needs you tonight",
      body: "All homework is in. Friday’s lesson is ready. The class is quiet in a good way.",
      because: "Last time you were ahead, you posted a photo to the class stream.",
      primary: "Peek at Friday",
      secondary: "Post a note",
    },
    needs: [],
    students: [
      { ...STUDENTS.minh, presence: "away", flag: "ready", note: "All caught up" },
      { ...STUDENTS.linh, presence: "away", flag: null, note: "All caught up" },
      { ...STUDENTS.an, presence: "away", flag: null, note: "Finished last night" },
      { ...STUDENTS.khoa, presence: "away", flag: null, note: "All caught up" },
      { ...STUDENTS.mai, presence: "away", flag: null, note: "All caught up" },
      { ...STUDENTS.tuan, presence: "away", flag: "quiet", note: "Finished · still shy in class" },
    ],
    lesson: {
      title: "Unit 1 · Session 3 · At school",
      status: "Ready for Friday",
      steps: [
        { label: "Warm-up · classroom", minutes: 5, done: true },
        { label: "Language in focus", minutes: 12, done: true },
        { label: "Explore the room", minutes: 12, done: true },
        { label: "Wrap + homework", minutes: 8, done: true },
      ],
    },
    homework: {
      title: "Family words — complete",
      done: 6,
      total: 6,
      missing: [],
    },
  },

  new_class: {
    id: "new_class",
    dockLabel: "New class",
    dockHint: "A brand-new class should make the next step obvious: people, then a time.",
    clock: "9:14 AM",
    weekday: "Monday",
    classTitle: "Grade 4 · Meet me",
    joinCode: CLASS.joinCode,
    studentCountLabel: "1 student",
    nextMeeting: "No weekly time yet",
    now: {
      kind: "invite",
      kicker: "This class is empty-ish",
      title: "Share the code, then pick a time",
      body: "Mai already joined. Five seats are still open. There’s no weekly meeting yet, so nothing else should compete with this.",
      because: "New classes stall when join code and schedule are buried in Settings and Schedule tabs.",
      primary: "Copy join link",
      secondary: "Set a weekly time",
    },
    needs: [
      {
        id: "schedule",
        tone: "now",
        title: "No weekly time",
        detail: "Parents can’t see a next lesson yet.",
        action: "Set time",
        panel: "schedule",
      },
    ],
    students: [
      { ...STUDENTS.mai, presence: "away", flag: "ready", note: "Joined this morning" },
    ],
    lesson: null,
    homework: null,
  },
};
