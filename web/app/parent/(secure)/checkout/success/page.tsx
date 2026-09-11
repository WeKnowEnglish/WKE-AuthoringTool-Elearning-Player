import { confirmParentLessonCheckout } from "@/lib/actions/parent-checkout";
import { ParentCheckoutSuccessView } from "@/components/parent/ParentCheckoutSuccessView";

export const metadata = {
  title: "Payment received — Parent portal",
  robots: { index: false, follow: false },
};

export default async function ParentCheckoutSuccessPage(props: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await props.searchParams;
  const result = sessionId?.trim()
    ? await confirmParentLessonCheckout(sessionId.trim())
    : { ok: false as const, error: "missing" };

  return (
    <ParentCheckoutSuccessView
      paid={result.ok && result.status === "paid"}
      pending={result.ok && result.status === "pending"}
      error={result.ok ? null : result.error}
    />
  );
}
