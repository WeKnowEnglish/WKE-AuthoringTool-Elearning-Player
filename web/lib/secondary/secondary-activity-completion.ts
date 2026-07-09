import { flushMasterySyncQueueForCurrentStudent } from "@/lib/mastery/supabase-sync";
import { notifySecondarySessionChanged } from "@/lib/secondary/secondary-session-events";

/** Run after secondary activity completion so home + Supabase stay in sync. */
export function afterSecondaryActivityCompletion(): void {
  notifySecondarySessionChanged();
  void flushMasterySyncQueueForCurrentStudent();
}
