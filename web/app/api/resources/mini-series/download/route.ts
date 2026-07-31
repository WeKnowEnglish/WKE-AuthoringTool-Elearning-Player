import { NextResponse } from "next/server";
import { verifyResourceDownloadToken } from "@/lib/lesson-plans/download-token";
import { resolveMiniSeriesDownload } from "@/lib/lesson-plans/resolve-mini-series-download";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const resource = url.searchParams.get("resource");

  if (!resource) {
    return NextResponse.json({ error: "Missing resource." }, { status: 400 });
  }

  const payload = verifyResourceDownloadToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Download link expired or invalid. Enter your email again." },
      { status: 401 },
    );
  }

  const file = await resolveMiniSeriesDownload(resource);
  if (!file) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
