import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createResourceDownloadToken,
  RESOURCE_DOWNLOAD_TOKEN_TTL_MS,
} from "@/lib/lesson-plans/download-token";
import { MINI_SERIES_LIBRARY } from "@/lib/lesson-plans/mini-series-manifest";
import { recordResourceDownloadLead } from "@/lib/lesson-plans/record-download-lead";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  sourcePage: z.string().trim().max(256).optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const sourcePage = parsed.data.sourcePage ?? MINI_SERIES_LIBRARY.sourcePage;

  await recordResourceDownloadLead({
    email,
    sourcePage,
    bundleId: MINI_SERIES_LIBRARY.id,
    userAgent: request.headers.get("user-agent"),
  });

  const token = createResourceDownloadToken(email);
  const expiresAt = Date.now() + RESOURCE_DOWNLOAD_TOKEN_TTL_MS;

  return NextResponse.json({
    token,
    expiresAt,
    bundleId: MINI_SERIES_LIBRARY.id,
  });
}
