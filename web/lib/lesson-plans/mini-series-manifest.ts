export type MiniSeriesLesson = {
  slug: string;
  title: string;
  filename: string;
  lessonCount: 3;
  minutesPerLesson: 50;
};

export type MiniSeriesPack = {
  slug: string;
  title: string;
  cefr: "A1" | "A2";
  gradeBand: string;
  lessons: MiniSeriesLesson[];
};

export const MINI_SERIES_LIBRARY_ID = "mini-series-library" as const;

export const MINI_SERIES_LIBRARY = {
  id: MINI_SERIES_LIBRARY_ID,
  title: "ESL Mini-Series Library",
  description:
    "Twelve ready-to-teach online mini-series for young learners — each series is three 50-minute lessons with objectives, exit tickets, and a final student product.",
  sourcePage: "/teach-english-online",
} as const;

/** Relative to `web/content/lesson-plans/mini-series/packs/` */
export const MINI_SERIES_PACKS: MiniSeriesPack[] = [
  {
    slug: "a1-fruits-vegetables-and-clothes",
    title: "Fruits, Vegetables & Clothes",
    cefr: "A1",
    gradeBand: "Grades 3–4",
    lessons: [
      {
        slug: "a1-fruits-and-vegetables",
        title: "Fruits and Vegetables",
        filename: "A1_Fruits_and_Vegetables_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
      {
        slug: "a1-clothes",
        title: "Clothes",
        filename: "A1_Clothes_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
    ],
  },
  {
    slug: "a1-routines",
    title: "Daily Routines",
    cefr: "A1",
    gradeBand: "Grades 3–4",
    lessons: [
      {
        slug: "a1-morning-routines",
        title: "Morning Routines",
        filename: "A1_Morning_Routines_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
      {
        slug: "a1-daily-routines",
        title: "Daily Routines",
        filename: "A1_Daily_Routines_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
    ],
  },
  {
    slug: "a1-pets-and-around-town",
    title: "Pets & Around Town",
    cefr: "A1",
    gradeBand: "Grades 4–5",
    lessons: [
      {
        slug: "a1-pets",
        title: "Caring for a Pet",
        filename: "A1_Pets_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
      {
        slug: "a1-around-town",
        title: "Around Town",
        filename: "A1_Around_Town_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
    ],
  },
  {
    slug: "a2-holiday-and-free-time",
    title: "Holiday & Free Time",
    cefr: "A2",
    gradeBand: "Grades 5–6",
    lessons: [
      {
        slug: "a2-holiday-planning",
        title: "Holiday Planning",
        filename: "A2_Holiday_Planning_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
      {
        slug: "a2-free-time",
        title: "Free Time",
        filename: "A2_Free_Time_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
    ],
  },
  {
    slug: "a2-animals-and-subjects",
    title: "Animals & School Subjects",
    cefr: "A2",
    gradeBand: "Grades 5–6",
    lessons: [
      {
        slug: "a2-animals-around-the-world",
        title: "Animals Around the World",
        filename: "A2_Animals_Around_the_World_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
      {
        slug: "a2-most-interesting-subject",
        title: "My Most Interesting Subject",
        filename: "A2_Most_Interesting_Subject_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
    ],
  },
  {
    slug: "a2-stuff-and-past",
    title: "Stuff & the Past",
    cefr: "A2",
    gradeBand: "Grades 6–7",
    lessons: [
      {
        slug: "a2-where-does-my-stuff-come-from",
        title: "Where Does My Stuff Come From?",
        filename: "A2_Where_Does_My_Stuff_Come_From_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
      {
        slug: "a2-what-was-the-past-like",
        title: "What Was the Past Like?",
        filename: "A2_What_Was_the_Past_Like_Mini_Series.docx",
        lessonCount: 3,
        minutesPerLesson: 50,
      },
    ],
  },
];

export type MiniSeriesResourceKind = "library" | "pack" | "lesson";

export type MiniSeriesResourceRef =
  | { kind: "library" }
  | { kind: "pack"; packSlug: string }
  | { kind: "lesson"; lessonSlug: string };

export function parseMiniSeriesResourceId(resourceId: string): MiniSeriesResourceRef | null {
  if (resourceId === "library") return { kind: "library" };
  if (resourceId.startsWith("pack:")) {
    const packSlug = resourceId.slice("pack:".length);
    return packSlug ? { kind: "pack", packSlug } : null;
  }
  if (resourceId.startsWith("lesson:")) {
    const lessonSlug = resourceId.slice("lesson:".length);
    return lessonSlug ? { kind: "lesson", lessonSlug } : null;
  }
  return null;
}

export function findPackBySlug(packSlug: string): MiniSeriesPack | undefined {
  return MINI_SERIES_PACKS.find((pack) => pack.slug === packSlug);
}

export function findLessonBySlug(lessonSlug: string): { pack: MiniSeriesPack; lesson: MiniSeriesLesson } | undefined {
  for (const pack of MINI_SERIES_PACKS) {
    const lesson = pack.lessons.find((entry) => entry.slug === lessonSlug);
    if (lesson) return { pack, lesson };
  }
  return undefined;
}

export function listAllLessons(): { pack: MiniSeriesPack; lesson: MiniSeriesLesson }[] {
  return MINI_SERIES_PACKS.flatMap((pack) =>
    pack.lessons.map((lesson) => ({ pack, lesson })),
  );
}
