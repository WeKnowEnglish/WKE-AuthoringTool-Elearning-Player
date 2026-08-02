"use client";

import { createClient } from "@/lib/supabase/client";

export function ParentAccountSwitchButton() {
  async function switchAccount() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={() => void switchAccount()}
      className="mt-5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
    >
      Sign in with another account
    </button>
  );
}
