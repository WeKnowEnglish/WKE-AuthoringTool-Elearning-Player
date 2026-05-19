import { redirect } from "next/navigation";
import { LevelLandingClient } from "@/components/landing/LevelLandingClient";
import {
  resolveLandingRedirectPath,
  shouldSkipLevelLanding,
} from "@/lib/landing/should-skip-landing";
import { createClient } from "@/lib/supabase/server";

export default async function LevelLandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (shouldSkipLevelLanding({ isAuthenticated: Boolean(user) })) {
    const path = resolveLandingRedirectPath(user);
    if (path) redirect(path);
    redirect("/login");
  }

  return <LevelLandingClient />;
}
