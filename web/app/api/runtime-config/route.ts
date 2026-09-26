import { NextResponse } from "next/server";
import { getSupabaseServerEnv } from "@/lib/env/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { url, anonKey } = getSupabaseServerEnv();
  const config = JSON.stringify({
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
  });

  return new NextResponse(`window.__WKE_RUNTIME_CONFIG__ = ${config};\n`, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "application/javascript; charset=utf-8",
    },
  });
}
