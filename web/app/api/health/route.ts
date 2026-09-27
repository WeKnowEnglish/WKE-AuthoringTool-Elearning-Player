import { createAppHealthPayload } from "@/lib/build/app-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return Response.json(createAppHealthPayload(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
