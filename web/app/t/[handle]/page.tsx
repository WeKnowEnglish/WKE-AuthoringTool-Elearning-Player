import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ handle: string }>;
};

/** Legacy Classroom Wall path — keep bookmarks working. */
export default async function LegacyTeacherSpaceRedirect({ params }: Props) {
  const { handle } = await params;
  redirect(`/wke/${encodeURIComponent(handle)}`);
}
