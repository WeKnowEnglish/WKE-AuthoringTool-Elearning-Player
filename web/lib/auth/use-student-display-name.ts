"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function resolveStudentDisplayName(metadata: Record<string, unknown> | undefined): string | null {
  const displayName = metadata?.display_name;
  if (typeof displayName === "string" && displayName.trim()) return displayName.trim();
  const username = metadata?.username;
  if (typeof username === "string" && username.trim()) return username.trim();
  return null;
}

/** Display name from the signed-in student's Supabase user metadata. */
export function useStudentDisplayName() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setDisplayName(
        resolveStudentDisplayName(user?.user_metadata as Record<string, unknown> | undefined),
      );
      setReady(true);
    };

    void sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setDisplayName(
        resolveStudentDisplayName(
          session?.user?.user_metadata as Record<string, unknown> | undefined,
        ),
      );
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { displayName, ready };
}
