import { redirect } from "next/navigation";
import { TeacherMessagesClient } from "@/components/teacher/messages/TeacherMessagesClient";
import { getTeacherMessagingPageData } from "@/lib/data/teacher-messaging";

export const metadata = {
  title: "Teacher messages — We Know English",
  robots: { index: false, follow: false },
};

export default async function TeacherMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedConversation = Array.isArray(params.conversation)
    ? params.conversation[0]
    : params.conversation;
  const data = await getTeacherMessagingPageData(requestedConversation);
  if (!data) redirect("/login?portal=teacher&next=/teacher/messages");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 py-5">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Coordinate with other verified teachers. Student and parent messaging is intentionally
          not included in this first release.
        </p>
      </div>
      <TeacherMessagesClient data={data} />
    </div>
  );
}
