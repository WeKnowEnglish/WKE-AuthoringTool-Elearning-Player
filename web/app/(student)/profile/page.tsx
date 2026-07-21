import { redirect } from "next/navigation";

/** Profile / achievements entry for the primary dashboard. */
export default function ProfileRedirectPage() {
  redirect("/primary?nav=progress");
}
