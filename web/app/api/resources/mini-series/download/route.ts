import { NextResponse } from "next/server";
import { verifyResourceDownloadToken } from "@/lib/lesson-plans/download-token";
import { recordResourceDownloadEvent } from "@/lib/lesson-plans/record-download-event";
import { resolveMiniSeriesDownload } from "@/lib/lesson-plans/resolve-mini-series-download";
import { readTrafficAttribution } from "@/lib/traffic/read-attribution";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const resource = url.searchParams.get("resource");
  const attribution = await readTrafficAttribution();
  const userAgent = request.headers.get("user-agent");
  const payload = resource ? verifyResourceDownloadToken(token) : null;

  if (!resource) {
    await recordResourceDownloadEvent({
      email: null,
      resourceId: "unknown",
      filename: null,
      byteSize: null,
      status: "error",
      userAgent,
      attribution,
    });
    return NextResponse.json({ error: "Missing resource." }, { status: 400 });
  }

  if (!payload) {
    await recordResourceDownloadEvent({
      email: null,
      resourceId: resource,
      filename: null,
      byteSize: null,
      status: "unauthorized",
      userAgent,
      attribution,
    });
    return NextResponse.json(
      { error: "Download link expired or invalid. Enter your email again." },
      { status: 401 },
    );
  }

  try {
    const file = await resolveMiniSeriesDownload(resource);
    if (!file) {
      await recordResourceDownloadEvent({
        email: payload.email,
        resourceId: resource,
        filename: null,
        byteSize: null,
        status: "not_found",
        userAgent,
        attribution,
      });
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    await recordResourceDownloadEvent({
      email: payload.email,
      resourceId: resource,
      filename: file.filename,
      byteSize: file.body.byteLength,
      status: "success",
      userAgent,
      attribution,
    });

    return new NextResponse(new Uint8Array(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    await recordResourceDownloadEvent({
      email: payload.email,
      resourceId: resource,
      filename: null,
      byteSize: null,
      status: "error",
      userAgent,
      attribution,
    });
    return NextResponse.json({ error: "Could not build that download." }, { status: 500 });
  }
}
