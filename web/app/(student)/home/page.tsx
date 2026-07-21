import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ collection?: string; room?: string; message?: string }>;
};

/**
 * F5 — legacy world hub retired. Bookmarks map onto Primary.
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */
export default async function StudentHomePage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  if (params.collection === "games") {
    redirect("/primary?nav=games");
  }
  if (params.message) {
    redirect(`/primary?message=${encodeURIComponent(params.message)}`);
  }
  redirect("/primary");
}
