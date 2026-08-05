import "server-only";

import { assertDailyApiKey } from "@/lib/env/daily-server";
import { logDaily } from "@/lib/daily/log";
import { DailyApiError } from "@/lib/daily/types";

const DAILY_API_BASE = "https://api.daily.co/v1";

export type DailyFetch = typeof fetch;

export async function dailyRequest<T>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    fetchImpl?: DailyFetch;
  } = {},
): Promise<T> {
  const apiKey = assertDailyApiKey();
  const fetchImpl = init.fetchImpl ?? fetch;
  const method = init.method ?? "GET";
  const response = await fetchImpl(`${DAILY_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = { error: text.slice(0, 200) };
    }
  }

  if (!response.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : `Daily API ${response.status}`;
    logDaily("api_error", {
      path,
      method,
      status: response.status,
      code:
        json && typeof json === "object" && "info" in json
          ? String((json as { info?: unknown }).info ?? "")
          : null,
    });
    throw new DailyApiError(message, response.status >= 500 ? 502 : response.status);
  }

  return json as T;
}
