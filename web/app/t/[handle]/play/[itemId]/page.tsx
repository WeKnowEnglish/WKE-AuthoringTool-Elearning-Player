import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ handle: string; itemId: string }>;
};

/** Legacy Classroom Wall play path — keep bookmarks working. */
export default async function LegacyTeacherSpacePlayRedirect({ params }: Props) {
  const { handle, itemId } = await params;
  redirect(
    `/wke/${encodeURIComponent(handle)}/play/${encodeURIComponent(itemId)}`,
  );
}
