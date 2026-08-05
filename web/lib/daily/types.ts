export type DailyCallRole = "teacher" | "student" | "guest";

export type DailyRoomRecord = {
  name: string;
  url: string;
  createdAt: string;
  expiresAt: string;
};

export type DailyMeetingTokenInput = {
  roomName: string;
  userId: string;
  userName: string;
  role: DailyCallRole;
  /** Unix seconds */
  exp: number;
};

export type DailyMeetingTokenResult = {
  token: string;
  roomName: string;
  roomUrl: string;
  exp: number;
  role: DailyCallRole;
};

export class DailyApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 502, code = "daily_api_error") {
    super(message);
    this.name = "DailyApiError";
    this.status = status;
    this.code = code;
  }
}

export class DailyConfigError extends Error {
  readonly code = "daily_not_configured";

  constructor(message = "Daily video is not configured.") {
    super(message);
    this.name = "DailyConfigError";
  }
}
