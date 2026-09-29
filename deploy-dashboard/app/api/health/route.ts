export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "wke-deploy-dashboard",
      version: "0.1.0",
      commit:
        process.env.WKE_DASHBOARD_BUILD_COMMIT_SHA?.trim() ||
        process.env.WKE_DASHBOARD_GIT_COMMIT_SHA?.trim() ||
        "development",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
