"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  createClassAnnouncementPost,
  createClassPhotoPostFromForm,
  deleteClassPost,
} from "@/lib/actions/class-posts";
import type { ClassPost } from "@/lib/class-posts/types";

type Props = {
  classId: string;
  archived: boolean;
  initialPosts: ClassPost[];
};

function formatPostDate(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ClassPostsPanel({ classId, archived, initialPosts }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [announcement, setAnnouncement] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const disabled = archived || isPending;

  const refresh = () => {
    router.refresh();
  };

  const handleAnnouncement = () => {
    setError(null);
    startTransition(async () => {
      const result = await createClassAnnouncementPost({ classId, body: announcement });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosts((current) => [result.post, ...current]);
      setAnnouncement("");
      refresh();
    });
  };

  const handlePhoto = () => {
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a photo to share.");
      return;
    }

    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("caption", caption);
    formData.set("photo", file);

    startTransition(async () => {
      const result = await createClassPhotoPostFromForm(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosts((current) => [result.post, ...current]);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh();
    });
  };

  const handleDelete = (postId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteClassPost({ classId, postId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosts((current) => current.filter((post) => post.id !== postId));
      refresh();
    });
  };

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Class noticeboard
        </p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">Post to your classroom</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Students see announcements and photos on their private classroom page — not on your public
          Teacher Space.
        </p>
      </div>

      {archived ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This class is archived. Unarchive it before posting again.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">Announcement</h3>
            <textarea
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              disabled={disabled}
              rows={4}
              placeholder="Share homework reminders, encouragement, or class news…"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            />
            <button
              type="button"
              disabled={disabled || !announcement.trim()}
              onClick={handleAnnouncement}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "Posting…" : "Post announcement"}
            </button>
          </div>

          <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">Photo</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={disabled}
              className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              disabled={disabled}
              rows={2}
              placeholder="Optional caption"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={handlePhoto}
              className="rounded-lg border border-neutral-900 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50"
            >
              {isPending ? "Sharing…" : "Share photo"}
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {posts.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900">Recent posts</h3>
          <ul className="space-y-3">
            {posts.map((post) => (
              <li
                key={post.id}
                className="rounded-lg border border-neutral-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-neutral-500">
                      {post.kind === "photo" ? "Photo" : "Announcement"} ·{" "}
                      {formatPostDate(post.publishedAt)}
                    </p>
                    {post.kind === "photo" && post.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.imageUrl}
                        alt={post.body || "Class photo"}
                        className="mt-2 max-h-40 w-full rounded-md object-cover"
                      />
                    ) : null}
                    {post.body ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">
                        {post.body}
                      </p>
                    ) : null}
                  </div>
                  {!archived ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDelete(post.id)}
                      className="shrink-0 text-xs font-semibold text-red-700 underline"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
