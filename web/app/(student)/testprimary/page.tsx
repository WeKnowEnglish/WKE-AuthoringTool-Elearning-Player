import { redirect } from "next/navigation";

/** Sandbox retired — primary dashboard lives at `/primary`. */
export default function TestPrimaryRedirectPage() {
  redirect("/primary");
}
