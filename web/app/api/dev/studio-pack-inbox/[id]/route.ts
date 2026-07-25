import { NextResponse } from "next/server";
import { getStudioPackInbox } from "@/lib/dev/studio-pack-inbox";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Studio pack inbox is not available in production." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const entry = getStudioPackInbox(id);
  if (!entry) {
    return NextResponse.json(
      { error: "Inbox pack not found or expired. Export again from Studio." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: entry.id,
    format: entry.format,
    filename: entry.filename ?? null,
    pack: entry.pack,
  });
}
