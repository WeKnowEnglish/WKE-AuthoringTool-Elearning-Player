import { redirect } from "next/navigation";

type Props = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    message?: string;
  }>;
};

export default async function TeacherLoginPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = new URLSearchParams();
  q.set("portal", "teacher");
  if (sp.next) q.set("next", sp.next);
  if (sp.error) q.set("error", sp.error);
  if (sp.message) q.set("message", sp.message);
  redirect(`/login?${q.toString()}`);
}
