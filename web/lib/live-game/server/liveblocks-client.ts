import { Liveblocks } from "@liveblocks/node";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";

let client: Liveblocks | null = null;

export function getLiveblocksServerClient(): Liveblocks {
  if (!client) {
    client = new Liveblocks({ secret: assertLiveblocksSecret() });
  }
  return client;
}
