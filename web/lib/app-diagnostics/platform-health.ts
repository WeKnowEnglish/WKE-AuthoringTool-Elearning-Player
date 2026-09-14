import type { AppDiagnosticKind, AppDiagnosticSurface } from "@/lib/app-diagnostics/types";

export type PlatformHealthJourneyId =
  | "authentication"
  | "homework"
  | "activity-loading"
  | "live-classroom";

export type PlatformHealthStatus =
  | "healthy"
  | "degraded"
  | "failing"
  | "insufficient-data";

export type PlatformIssueSeverity = "critical" | "high" | "warning";
export type PlatformIssueTrend = "new" | "up" | "steady" | "down";

export type PlatformHealthEvent = {
  occurredAt: string;
  userLabel?: string | null;
  sessionId: string;
  surface: AppDiagnosticSurface;
  phase: string;
  name: string;
  kind: AppDiagnosticKind;
  route?: string | null;
  activityId?: string | null;
  homeworkId?: string | null;
  classroomSessionId?: string | null;
  status?: string | null;
  errorCode?: string | null;
  appVersion?: string | null;
  deviceCategory?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PlatformHealthJourneySummary = {
  id: PlatformHealthJourneyId;
  label: string;
  status: PlatformHealthStatus;
  observedEvents: number;
  successes: number;
  failures: number;
  failureRate: number | null;
  rule: string;
};

export type PlatformIssueGroup = {
  fingerprint: string;
  journey: PlatformHealthJourneyId;
  severity: PlatformIssueSeverity;
  trend: PlatformIssueTrend;
  count: number;
  recentCount: number;
  previousCount: number;
  affectedSessions: number;
  affectedUsers: number | null;
  affectedUsersSuppressed: boolean;
  firstOccurrence: string;
  latestOccurrence: string;
  latestRelease: string;
  surface: AppDiagnosticSurface;
  phase: string;
  name: string;
  errorCode: string;
  routePattern: string;
  devices: Array<{ name: string; count: number }>;
};

export type PlatformHealthSnapshot = {
  generatedAt: string;
  windowHours: number;
  totalEvents: number;
  classifiedEvents: number;
  journeys: PlatformHealthJourneySummary[];
  issueGroups: PlatformIssueGroup[];
  releases: string[];
  devices: string[];
};

export const PLATFORM_HEALTH_WINDOWS = [6, 24, 168] as const;

export const PLATFORM_HEALTH_JOURNEYS: ReadonlyArray<{
  id: PlatformHealthJourneyId;
  label: string;
}> = [
  { id: "authentication", label: "Authentication" },
  { id: "homework", label: "Homework" },
  { id: "activity-loading", label: "Activity loading" },
  { id: "live-classroom", label: "Live classroom" },
];

const FAILURE_STATUSES = new Set([
  "error",
  "failed",
  "failure",
  "offline",
  "rejected",
  "timed_out",
]);

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeDiagnosticRoutePattern(route: string | null | undefined) {
  const pathname = (route ?? "").split("?")[0]?.trim();
  if (!pathname) return "unknown-route";

  return pathname
    .split("/")
    .map((segment) => {
      if (!segment || segment.startsWith(":")) return segment;
      if (/^vcs_[a-z0-9_-]+$/i.test(segment)) return ":classroomSessionId";
      if (/^[0-9]+$/.test(segment)) return ":id";
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ":id";
      if (/^[a-z0-9_-]{40,}$/i.test(segment)) return ":id";
      return segment.slice(0, 80);
    })
    .join("/")
    .slice(0, 240);
}

export function classifyPlatformHealthJourney(
  event: PlatformHealthEvent,
): PlatformHealthJourneyId | null {
  const phase = normalized(event.phase);
  const name = normalized(event.name);
  const route = normalizeDiagnosticRoutePattern(event.route).toLowerCase();

  if (
    phase === "authentication" ||
    phase === "homework_auth" ||
    name.startsWith("login_") ||
    route === "/login" ||
    route.includes("/login/")
  ) {
    return "authentication";
  }

  if (phase.includes("homework") || event.homeworkId) return "homework";

  if (
    event.classroomSessionId ||
    phase.includes("virtual-classroom") ||
    phase.includes("classroom_realtime") ||
    name.includes("classroom_") ||
    name.includes("reconnect_") ||
    route.includes("virtual-classroom")
  ) {
    return "live-classroom";
  }

  if (
    event.surface === "lesson" ||
    phase === "chunk" ||
    phase === "activity" ||
    Boolean(event.activityId) ||
    route.includes("/learn")
  ) {
    return "activity-loading";
  }

  return null;
}

function platformHealthOutcome(
  event: PlatformHealthEvent,
  journey: PlatformHealthJourneyId,
): "success" | "failure" | "unknown" {
  const status = normalized(event.status);
  const name = normalized(event.name);

  if (
    event.metadata?.ok === false ||
    event.kind === "error" ||
    FAILURE_STATUSES.has(status) ||
    name.endsWith("_failed") ||
    name.includes("_error")
  ) {
    return "failure";
  }

  if (journey === "authentication") {
    return name === "login_succeeded" ? "success" : "unknown";
  }
  if (journey === "homework") {
    return /^(homework_opened|save_settled|submit_settled|submit_succeeded|reconciliation_succeeded|duplicate_prevented|teacher_result_opened)$/.test(name)
      ? "success"
      : "unknown";
  }
  if (journey === "activity-loading") {
    return /^(activity_opened|activity_completed|lesson_start|lesson_complete)$/.test(name) ||
      (event.kind === "span" && normalized(event.phase) === "chunk")
      ? "success"
      : "unknown";
  }
  return name === "classroom_reconnect_recovered" ||
    name === "classroom_opened" ||
    (event.kind === "span" && normalized(event.phase) === "virtual-classroom")
    ? "success"
    : "unknown";
}

function safeFingerprintPart(value: string | null | undefined, fallback: string) {
  const safe = normalized(value)
    .replace(/[^a-z0-9:_./-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);
  return safe || fallback;
}

function diagnosticErrorCode(event: PlatformHealthEvent) {
  const explicit = event.errorCode?.trim();
  if (explicit) return explicit;
  const httpStatus = event.metadata?.status;
  return typeof httpStatus === "number" && Number.isFinite(httpStatus)
    ? `http_${Math.round(httpStatus)}`
    : "no-code";
}

export function diagnosticIssueFingerprint(event: PlatformHealthEvent) {
  const journey = classifyPlatformHealthJourney(event);
  if (!journey || platformHealthOutcome(event, journey) !== "failure") return null;
  return [
    journey,
    safeFingerprintPart(event.surface, "unknown-surface"),
    safeFingerprintPart(event.phase, "unknown-phase"),
    safeFingerprintPart(event.name, "unknown-event"),
    safeFingerprintPart(diagnosticErrorCode(event), "no-code"),
    safeFingerprintPart(normalizeDiagnosticRoutePattern(event.route), "unknown-route"),
    safeFingerprintPart(event.appVersion, "unknown-release"),
  ].join("|");
}

function severityForEvent(event: PlatformHealthEvent): PlatformIssueSeverity {
  const signal = `${normalized(event.errorCode)} ${normalized(event.name)}`;
  if (/(unauthori[sz]ed|forbidden|privacy|integrity|data[-_ ]?loss)/.test(signal)) {
    return "critical";
  }
  if (/(offline|timeout|timed_out|connection)/.test(signal)) return "warning";
  return "high";
}

function highestSeverity(
  current: PlatformIssueSeverity,
  candidate: PlatformIssueSeverity,
): PlatformIssueSeverity {
  const rank: Record<PlatformIssueSeverity, number> = {
    warning: 1,
    high: 2,
    critical: 3,
  };
  return rank[candidate] > rank[current] ? candidate : current;
}

function issueTrend(recentCount: number, previousCount: number): PlatformIssueTrend {
  if (previousCount === 0 && recentCount > 0) return "new";
  if (recentCount > previousCount * 1.5) return "up";
  if (previousCount > recentCount * 1.5) return "down";
  return "steady";
}

export function buildPlatformHealthSnapshot(
  events: PlatformHealthEvent[],
  options?: { now?: Date; windowHours?: number },
): PlatformHealthSnapshot {
  const now = options?.now ?? new Date();
  const windowHours = Math.max(1, Math.min(options?.windowHours ?? 24, 168));
  const windowStartMs = now.getTime() - windowHours * 3_600_000;
  const midpointMs = windowStartMs + (now.getTime() - windowStartMs) / 2;
  const inWindow = events.filter((event) => {
    const occurredAt = Date.parse(event.occurredAt);
    return Number.isFinite(occurredAt) && occurredAt >= windowStartMs && occurredAt <= now.getTime();
  });

  const journeyEvents = new Map<PlatformHealthJourneyId, Array<{
    event: PlatformHealthEvent;
    outcome: "success" | "failure" | "unknown";
  }>>();
  for (const journey of PLATFORM_HEALTH_JOURNEYS) journeyEvents.set(journey.id, []);

  for (const event of inWindow) {
    const journey = classifyPlatformHealthJourney(event);
    if (!journey) continue;
    journeyEvents.get(journey)?.push({ event, outcome: platformHealthOutcome(event, journey) });
  }

  const journeys = PLATFORM_HEALTH_JOURNEYS.map(({ id, label }) => {
    const entries = journeyEvents.get(id) ?? [];
    const successes = entries.filter(({ outcome }) => outcome === "success").length;
    const failures = entries.filter(({ outcome }) => outcome === "failure").length;
    const decided = successes + failures;
    const failureRate = decided > 0 ? failures / decided : null;
    let status: PlatformHealthStatus = "insufficient-data";
    let rule = "No explicit success or failure outcome was observed in this window.";
    if (failures >= 3 && failureRate != null && failureRate >= 0.25) {
      status = "failing";
      rule = "At least 3 failures and a failure rate of 25% or more.";
    } else if (failures > 0) {
      status = "degraded";
      rule = "At least one failure was observed, below the failing threshold.";
    } else if (successes > 0) {
      status = "healthy";
      rule = "At least one explicit success and no failures were observed.";
    }
    return {
      id,
      label,
      status,
      observedEvents: entries.length,
      successes,
      failures,
      failureRate,
      rule,
    };
  });

  type MutableGroup = Omit<PlatformIssueGroup, "devices" | "trend"> & {
    sessions: Set<string>;
    users: Set<string>;
    deviceCounts: Map<string, number>;
  };
  const grouped = new Map<string, MutableGroup>();

  for (const event of inWindow) {
    const fingerprint = diagnosticIssueFingerprint(event);
    const journey = classifyPlatformHealthJourney(event);
    if (!fingerprint || !journey) continue;
    const occurredMs = Date.parse(event.occurredAt);
    const device = normalized(event.deviceCategory) || "unknown";
    const release = event.appVersion?.trim() || "unknown-release";
    const existing = grouped.get(fingerprint);
    if (!existing) {
      grouped.set(fingerprint, {
        fingerprint,
        journey,
        severity: severityForEvent(event),
        count: 1,
        recentCount: occurredMs >= midpointMs ? 1 : 0,
        previousCount: occurredMs < midpointMs ? 1 : 0,
        affectedSessions: 1,
        affectedUsers: null,
        affectedUsersSuppressed: true,
        firstOccurrence: event.occurredAt,
        latestOccurrence: event.occurredAt,
        latestRelease: release,
        surface: event.surface,
        phase: event.phase,
        name: event.name,
        errorCode: diagnosticErrorCode(event),
        routePattern: normalizeDiagnosticRoutePattern(event.route),
        sessions: new Set([event.sessionId]),
        users: new Set(event.userLabel && event.userLabel !== "Unknown user" ? [event.userLabel] : []),
        deviceCounts: new Map([[device, 1]]),
      });
      continue;
    }

    existing.count += 1;
    existing.recentCount += occurredMs >= midpointMs ? 1 : 0;
    existing.previousCount += occurredMs < midpointMs ? 1 : 0;
    existing.sessions.add(event.sessionId);
    if (event.userLabel && event.userLabel !== "Unknown user") existing.users.add(event.userLabel);
    existing.deviceCounts.set(device, (existing.deviceCounts.get(device) ?? 0) + 1);
    existing.severity = highestSeverity(existing.severity, severityForEvent(event));
    if (Date.parse(existing.firstOccurrence) > occurredMs) existing.firstOccurrence = event.occurredAt;
    if (Date.parse(existing.latestOccurrence) < occurredMs) {
      existing.latestOccurrence = event.occurredAt;
      existing.latestRelease = release;
    }
  }

  const issueGroups = [...grouped.values()]
    .map((group): PlatformIssueGroup => {
      const affectedUsers = group.users.size >= 3 ? group.users.size : null;
      return {
        fingerprint: group.fingerprint,
        journey: group.journey,
        severity: group.severity,
        trend: issueTrend(group.recentCount, group.previousCount),
        count: group.count,
        recentCount: group.recentCount,
        previousCount: group.previousCount,
        affectedSessions: group.sessions.size,
        affectedUsers,
        affectedUsersSuppressed: affectedUsers == null,
        firstOccurrence: group.firstOccurrence,
        latestOccurrence: group.latestOccurrence,
        latestRelease: group.latestRelease,
        surface: group.surface,
        phase: group.phase,
        name: group.name,
        errorCode: group.errorCode,
        routePattern: group.routePattern,
        devices: [...group.deviceCounts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      };
    })
    .sort((a, b) => {
      const severityRank: Record<PlatformIssueSeverity, number> = {
        critical: 3,
        high: 2,
        warning: 1,
      };
      return severityRank[b.severity] - severityRank[a.severity] ||
        b.count - a.count ||
        Date.parse(b.latestOccurrence) - Date.parse(a.latestOccurrence);
    });

  return {
    generatedAt: now.toISOString(),
    windowHours,
    totalEvents: inWindow.length,
    classifiedEvents: [...journeyEvents.values()].reduce((sum, entries) => sum + entries.length, 0),
    journeys,
    issueGroups,
    releases: [...new Set(inWindow.map((event) => event.appVersion?.trim() || "unknown-release"))].sort(),
    devices: [...new Set(inWindow.map((event) => normalized(event.deviceCategory) || "unknown"))].sort(),
  };
}
