import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TeacherSpacePlayClient } from "@/components/teacher-space/TeacherSpacePlayClient";
import {
  loadPublicTeacherSpace,
  loadPublicTeacherSpaceItem,
} from "@/lib/data/teacher-space";
import { teacherSpacePublicPath } from "@/lib/teacher-space/paths";

type Props = {
  params: Promise<{ handle: string; itemId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, itemId } = await params;
  const item = await loadPublicTeacherSpaceItem(handle, itemId);
  if (!item) {
    return { title: "Activity", robots: { index: false, follow: false } };
  }
  return {
    title: `${item.title} · Practice`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicTeacherSpacePlayPage({ params }: Props) {
  const { handle, itemId } = await params;
  const [spacePage, item] = await Promise.all([
    loadPublicTeacherSpace(handle),
    loadPublicTeacherSpaceItem(handle, itemId),
  ]);
  if (!spacePage || !item) notFound();

  const backHref = teacherSpacePublicPath(spacePage.space.handle);

  return (
    <TeacherSpacePlayClient
      spaceTitle={item.spaceTitle || spacePage.space.title}
      itemId={item.id}
      title={item.title}
      format={item.format}
      pack={item.pack}
      backHref={backHref}
      themeId={item.theme_id || spacePage.space.theme_id}
    />
  );
}
