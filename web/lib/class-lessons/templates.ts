import type {
  ClassLessonPhase,
  ClassLessonStepInput,
} from "@/lib/class-lessons/types";

export const CLASS_LESSON_TEMPLATE_KEYS = [
  "blank",
  "simple_esl",
  "skills_lesson",
  "review_mastery",
] as const;

export type ClassLessonTemplateKey =
  (typeof CLASS_LESSON_TEMPLATE_KEYS)[number];

export type ClassLessonTemplate = {
  key: ClassLessonTemplateKey;
  version: number;
  name: string;
  description: string;
  recommended: boolean;
  title: string;
  objective: string;
  durationMinutes: number;
  targetLanguage: string;
  successCheck: string;
  steps: ClassLessonStepInput[];
};

function teachingStep(input: {
  title: string;
  phase: ClassLessonPhase;
  durationMinutes: number;
  teacherAction: string;
  studentAction: string;
  materialNote?: string;
}): ClassLessonStepInput {
  return {
    kind: "custom",
    title: input.title,
    phase: input.phase,
    durationMinutes: input.durationMinutes,
    teacherAction: input.teacherAction,
    studentAction: input.studentAction,
    config: { materialNote: input.materialNote ?? "" },
  };
}

export const CLASS_LESSON_TEMPLATES: readonly ClassLessonTemplate[] = [
  {
    key: "simple_esl",
    version: 1,
    name: "Simple ESL lesson",
    description: "A balanced 45-minute lesson from retrieval to an exit check.",
    recommended: true,
    title: "New ESL lesson",
    objective: "Students will be able to…",
    durationMinutes: 45,
    targetLanguage: "",
    successCheck: "Students can use the target language in a short independent task.",
    steps: [
      teachingStep({
        title: "Warm-up and retrieval",
        phase: "warm_up",
        durationMinutes: 5,
        teacherAction: "Reactivate useful language from the previous lesson.",
        studentAction: "Recall and use familiar language in a quick task.",
      }),
      teachingStep({
        title: "Teach or model",
        phase: "teach",
        durationMinutes: 8,
        teacherAction: "Present the new language in a clear context and model examples.",
        studentAction: "Notice the meaning, form, and pronunciation of the target language.",
      }),
      teachingStep({
        title: "Guided practice",
        phase: "guided_practice",
        durationMinutes: 10,
        teacherAction: "Support practice and correct important misunderstandings.",
        studentAction: "Complete a scaffolded task with a partner or the teacher.",
      }),
      teachingStep({
        title: "Communicative practice",
        phase: "communicative_practice",
        durationMinutes: 15,
        teacherAction: "Monitor, encourage communication, and note useful feedback.",
        studentAction: "Use the target language to communicate a real message.",
      }),
      teachingStep({
        title: "Exit check",
        phase: "assessment",
        durationMinutes: 5,
        teacherAction: "Check the learning goal and identify the next teaching step.",
        studentAction: "Complete a short independent check or reflection.",
      }),
      teachingStep({
        title: "Homework or next step",
        phase: "homework",
        durationMinutes: 2,
        teacherAction: "Explain the follow-up task and what successful work looks like.",
        studentAction: "Record the follow-up task and ask any final questions.",
      }),
    ],
  },
  {
    key: "skills_lesson",
    version: 1,
    name: "Skills lesson",
    description: "Move from a reading or listening input toward meaningful output.",
    recommended: false,
    title: "New skills lesson",
    objective: "Students will be able to understand and respond to…",
    durationMinutes: 45,
    targetLanguage: "",
    successCheck: "Students can identify the main message and complete the final response task.",
    steps: [
      teachingStep({
        title: "Lead-in",
        phase: "warm_up",
        durationMinutes: 5,
        teacherAction: "Activate topic knowledge and give students a reason to engage.",
        studentAction: "Discuss what they already know about the topic.",
      }),
      teachingStep({
        title: "Prepare for the text",
        phase: "teach",
        durationMinutes: 7,
        teacherAction: "Pre-teach only the language needed to access the text.",
        studentAction: "Predict content and clarify essential language.",
      }),
      teachingStep({
        title: "First reading or listening",
        phase: "guided_practice",
        durationMinutes: 8,
        teacherAction: "Set one clear gist question.",
        studentAction: "Read or listen for the main idea.",
      }),
      teachingStep({
        title: "Second task",
        phase: "guided_practice",
        durationMinutes: 10,
        teacherAction: "Set a focused detail or language-noticing task.",
        studentAction: "Find evidence and compare answers.",
      }),
      teachingStep({
        title: "Respond and communicate",
        phase: "communicative_practice",
        durationMinutes: 10,
        teacherAction: "Support students in using ideas or language from the text.",
        studentAction: "Create a spoken or written response.",
      }),
      teachingStep({
        title: "Exit check",
        phase: "assessment",
        durationMinutes: 5,
        teacherAction: "Check the learning goal with one short task.",
        studentAction: "Show what they understood or can now do.",
      }),
    ],
  },
  {
    key: "review_mastery",
    version: 1,
    name: "Review and mastery",
    description: "Retrieve prior learning, diagnose gaps, and finish with evidence of mastery.",
    recommended: false,
    title: "Review lesson",
    objective: "Students will be able to retrieve and apply…",
    durationMinutes: 45,
    targetLanguage: "",
    successCheck: "Students can complete the final task independently with accurate language.",
    steps: [
      teachingStep({
        title: "Retrieval challenge",
        phase: "review",
        durationMinutes: 8,
        teacherAction: "Prompt recall before giving answers or examples.",
        studentAction: "Retrieve key language from memory.",
      }),
      teachingStep({
        title: "Check and diagnose",
        phase: "assessment",
        durationMinutes: 7,
        teacherAction: "Identify the smallest important gaps to reteach.",
        studentAction: "Check answers and explain uncertain choices.",
      }),
      teachingStep({
        title: "Focused reteach",
        phase: "teach",
        durationMinutes: 8,
        teacherAction: "Model the difficult point with contrasting examples.",
        studentAction: "Notice and explain the corrected pattern.",
      }),
      teachingStep({
        title: "Mixed practice",
        phase: "independent_practice",
        durationMinutes: 12,
        teacherAction: "Give feedback after students make a genuine attempt.",
        studentAction: "Apply the language across varied examples.",
      }),
      teachingStep({
        title: "Mastery check",
        phase: "assessment",
        durationMinutes: 7,
        teacherAction: "Collect clear evidence against the learning goal.",
        studentAction: "Complete a short independent performance task.",
      }),
      teachingStep({
        title: "Reflect and plan",
        phase: "reflection",
        durationMinutes: 3,
        teacherAction: "Name progress and set the next practice priority.",
        studentAction: "Identify one strength and one next step.",
      }),
    ],
  },
  {
    key: "blank",
    version: 1,
    name: "Blank lesson",
    description: "Start with an empty plan and add only the steps you need.",
    recommended: false,
    title: "Untitled lesson",
    objective: "",
    durationMinutes: 45,
    targetLanguage: "",
    successCheck: "",
    steps: [],
  },
] as const;

export function getClassLessonTemplate(
  value: unknown,
): ClassLessonTemplate {
  const key = typeof value === "string" ? value : "blank";
  return (
    CLASS_LESSON_TEMPLATES.find((template) => template.key === key) ??
    CLASS_LESSON_TEMPLATES[CLASS_LESSON_TEMPLATES.length - 1]
  );
}
