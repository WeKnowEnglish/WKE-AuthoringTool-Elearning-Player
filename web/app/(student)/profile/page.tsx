import { redirect } from "next/navigation";

/** Achievements and skills moved to `/home` Collection book. */
export default function ProfileRedirectPage() {
  redirect("/home?collection=achievements");
}
