import { redirect } from "next/navigation";
import { QUESTIONS_POSTER_SLUG } from "@/lib/grammar-builder";

export default function GrammarPilotRedirectPage() {
  redirect(`/grammar/${QUESTIONS_POSTER_SLUG}`);
}
