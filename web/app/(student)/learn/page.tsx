import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Familiar Learn entry — lands on the primary dashboard Home. */
export default async function LearnPage() {
  redirect("/primary");
}
