import { NextResponse } from "next/server";

import { assertSameOrigin, getRequestOrigin } from "../../../../lib/auth.mjs";
import { auditEvent, getControlPlane } from "../../../../lib/control-plane";
import { isAdminAuthenticated } from "../../../../lib/dashboard-auth";

function redirectWith(requestOrigin: string, key: "notice" | "error", message: string) {
  const url = new URL("/deployments", requestOrigin);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return new Response("Unauthorized", { status: 401 });
  let requestOrigin: string;
  try {
    assertSameOrigin(request);
    requestOrigin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const form = await request.formData();
    const branch = String(form.get("branch") || "");
    const { config, hostinger } = getControlPlane();
    const build = await hostinger.startGitBuild({
      domain: config.previewDomain,
      branch,
      installationUuid: config.installationUuid,
      owner: config.githubOwner,
      repository: config.githubRepository,
      rootDirectory: ".",
      outputDirectory: "web/.next",
    });
    auditEvent("preview.build_requested", { branch, buildUuid: build.uuid, domain: config.previewDomain });
    return redirectWith(requestOrigin, "notice", `Preview build ${build.uuid.slice(0, 12)} was queued.`);
  } catch (error) {
    return redirectWith(requestOrigin, "error", error instanceof Error ? error.message : String(error));
  }
}
