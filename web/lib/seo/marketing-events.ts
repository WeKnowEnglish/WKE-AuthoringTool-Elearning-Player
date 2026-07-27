/**
 * Privacy-safe marketing analytics.
 * Never pass names, emails, birth dates, join codes, answers, chat, audio, or UGC.
 */
export const MARKETING_EVENT_NAMES = [
  "homepage_view",
  "audience_teacher_click",
  "audience_student_click",
  "audience_parent_click",
  "free_activity_view",
  "free_activity_start",
  "teacher_signup_start",
  "student_signin_click",
  "join_class_click",
  "sample_lesson_open",
] as const;

export type MarketingEventName = (typeof MARKETING_EVENT_NAMES)[number];

export type MarketingEventProps = {
  activityType?: "flashcards" | "grammar_poster" | "learning_track" | "listen_choose" | "other";
  topic?: string;
  cefr?: string;
  gradeBand?: "primary" | "upper-primary" | "secondary" | "mixed";
  userRole?: "teacher" | "student" | "parent" | "anonymous";
  authState?: "anonymous" | "authenticated";
  landingPage?: string;
  cta?: string;
};

const STORAGE_KEY = "wke:marketing-events:v1";
const MAX_EVENTS = 200;

function isBrowser() {
  return typeof window !== "undefined";
}

function sanitizeProps(props: MarketingEventProps = {}): MarketingEventProps {
  const allowed: MarketingEventProps = {};
  if (props.activityType) allowed.activityType = props.activityType;
  if (props.topic) allowed.topic = props.topic.slice(0, 64);
  if (props.cefr) allowed.cefr = props.cefr.slice(0, 8);
  if (props.gradeBand) allowed.gradeBand = props.gradeBand;
  if (props.userRole) allowed.userRole = props.userRole;
  if (props.authState) allowed.authState = props.authState;
  if (props.landingPage) allowed.landingPage = props.landingPage.slice(0, 128);
  if (props.cta) allowed.cta = props.cta.slice(0, 64);
  return allowed;
}

/**
 * Records a marketing event locally (sessionStorage) for later wiring to a
 * privacy-reviewed analytics provider. Safe props only.
 */
export function trackMarketingEvent(
  name: MarketingEventName,
  props: MarketingEventProps = {},
): void {
  if (!isBrowser()) return;
  if (!(MARKETING_EVENT_NAMES as readonly string[]).includes(name)) return;

  const payload = {
    name,
    props: sanitizeProps(props),
    ts: Date.now(),
    path: window.location.pathname.slice(0, 128),
  };

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    const next = Array.isArray(list) ? list : [];
    next.push(payload);
    while (next.length > MAX_EVENTS) next.shift();
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Analytics must never interrupt the page.
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[marketing]", payload.name, payload.props);
  }
}
