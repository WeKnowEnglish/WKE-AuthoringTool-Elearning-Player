/** Shared lesson screen / catalog row shapes (runtime templates + legacy DB rows). */

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  target: string;
  cover_image_url?: string | null;
  order_index: number;
  published: boolean;
};

export type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  order_index: number;
  published: boolean;
  unlock_strategy: "sequential" | "always_open" | "manual";
  manual_unlocked: boolean;
};

export type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  order_index: number;
  published: boolean;
  estimated_minutes: number | null;
  /** Optional post-lesson bookend playground (parsed with `completionPlaygroundSchema`). */
  completion_playground?: unknown;
};

export type LessonScreenRow = {
  id: string;
  lesson_id: string;
  order_index: number;
  screen_type: string;
  payload: unknown;
  updated_at?: string;
};
