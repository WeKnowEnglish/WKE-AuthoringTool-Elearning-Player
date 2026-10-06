import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { applyTrafficAttribution } from "@/lib/traffic/apply-attribution-cookie";
import { shouldSendPreviewNoindex } from "@/lib/seo/canonical";

/** Next.js 16+ — replaces deprecated `middleware.ts` / `middleware` export. */
export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  const finalResponse = applyTrafficAttribution(request, response);
  // Managed hosts can forward an internal localhost Host. Use the configured
  // deployment origin to distinguish production from the independent preview.
  let deploymentHost = request.headers.get("host");
  const origin = process.env.APP_ORIGIN?.trim() || process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (origin) {
    try { deploymentHost = new URL(origin).host; } catch { /* Keep the request host. */ }
  }
  if (shouldSendPreviewNoindex(deploymentHost)) {
    finalResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return finalResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
