"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  Camera,
  Gamepad2,
  Link2,
  Megaphone,
  Pin,
  PinOff,
  Trash2,
  UsersRound,
} from "lucide-react";
import { ClassroomPostCard } from "@/components/classroom/ClassroomPostCard";
import {
  createClassActivityPost,
  createClassAnnouncementPost,
  createClassHomeworkReminderPost,
  createClassLinkPost,
  createClassPhotoPostFromForm,
  deleteClassPost,
  setClassPostGuardianVisibility,
  setClassPostPinned,
} from "@/lib/actions/class-posts";
import type { ClassHomework } from "@/lib/class-homework/types";
import type { ClassPost } from "@/lib/class-posts/types";
import { sortClassPostsForFeed } from "@/lib/class-posts/types";
import type { TeacherSpaceItemSummary } from "@/lib/teacher-space/types";

type Props = {
  classId: string;
  archived: boolean;
  initialPosts: ClassPost[];
  homework: ClassHomework[];
  spaceItems: TeacherSpaceItemSummary[];
};

type ComposerMode = "message" | "photo" | "link" | "homework" | "activity";

const emptyDraftFields = {
  imageUrl: null as string | null,
  linkUrl: null as string | null,
  linkTitle: null as string | null,
  homeworkId: null as string | null,
  activitySpaceItemId: null as string | null,
  activityTitle: null as string | null,
  activityPlayPath: null as string | null,
  pinnedAt: null as string | null,
  guardianVisibility: "none" as const,
};

export function ClassPostsPanel({
  classId,
  archived,
  initialPosts,
  homework,
  spaceItems,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState(() => sortClassPostsForFeed(initialPosts));
  const [mode, setMode] = useState<ComposerMode>("message");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [homeworkId, setHomeworkId] = useState("");
  const [spaceItemId, setSpaceItemId] = useState("");
  const [pinOnPost, setPinOnPost] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const disabled = archived || isPending;

  const reminderHomework = useMemo(
    () =>
      homework.filter(
        (item) => item.status === "assigned" || item.status === "closed",
      ),
    [homework],
  );

  useEffect(() => {
    setPosts(sortClassPostsForFeed(initialPosts));
  }, [initialPosts]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (mode !== "homework") return;
    if (homeworkId) return;
    if (reminderHomework[0]) setHomeworkId(reminderHomework[0].id);
  }, [homeworkId, mode, reminderHomework]);

  useEffect(() => {
    if (mode !== "activity") return;
    if (spaceItemId) return;
    if (spaceItems[0]) setSpaceItemId(spaceItems[0].id);
  }, [mode, spaceItemId, spaceItems]);

  const selectedHomework = reminderHomework.find((item) => item.id === homeworkId);
  const selectedSpaceItem = spaceItems.find((item) => item.id === spaceItemId);

  const draftPost = useMemo((): ClassPost | null => {
    const trimmed = body.trim();
    const now = new Date().toISOString();
    const pinnedAt = pinOnPost ? now : null;

    if (mode === "message") {
      if (!trimmed) return null;
      return {
        id: "draft-message",
        classId,
        teacherId: "draft",
        kind: "announcement",
        body: trimmed,
        publishedAt: now,
        createdAt: now,
        ...emptyDraftFields,
        pinnedAt,
      };
    }

    if (mode === "photo") {
      if (!photoPreviewUrl && !trimmed) return null;
      return {
        id: "draft-photo",
        classId,
        teacherId: "draft",
        kind: "photo",
        body: trimmed,
        publishedAt: now,
        createdAt: now,
        ...emptyDraftFields,
        imageUrl: photoPreviewUrl,
        pinnedAt,
      };
    }

    if (mode === "link") {
      const url = linkUrl.trim();
      if (!url && !trimmed && !linkTitle.trim()) return null;
      return {
        id: "draft-link",
        classId,
        teacherId: "draft",
        kind: "link",
        body: trimmed,
        publishedAt: now,
        createdAt: now,
        ...emptyDraftFields,
        linkUrl: url || "https://example.com",
        linkTitle: linkTitle.trim() || null,
        pinnedAt,
      };
    }

    if (mode === "activity") {
      if (!selectedSpaceItem && !trimmed) return null;
      return {
        id: "draft-activity",
        classId,
        teacherId: "draft",
        kind: "activity",
        body: trimmed,
        publishedAt: now,
        createdAt: now,
        ...emptyDraftFields,
        activitySpaceItemId: selectedSpaceItem?.id ?? "draft-item",
        activityTitle: selectedSpaceItem?.title ?? "Class activity",
        activityPlayPath: selectedSpaceItem?.playPath ?? "/wke/demo/play/draft",
        pinnedAt,
      };
    }

    if (!selectedHomework && !trimmed) return null;
    return {
      id: "draft-homework",
      classId,
      teacherId: "draft",
      kind: "homework_reminder",
      body: trimmed || `Reminder: ${selectedHomework?.title ?? "Homework"}`,
      publishedAt: now,
      createdAt: now,
      ...emptyDraftFields,
      homeworkId: selectedHomework?.id ?? "draft-homework-id",
      pinnedAt,
    };
  }, [
    body,
    classId,
    linkTitle,
    linkUrl,
    mode,
    photoPreviewUrl,
    pinOnPost,
    selectedHomework,
    selectedSpaceItem,
  ]);

  const canPost =
    mode === "message"
      ? Boolean(body.trim())
      : mode === "photo"
        ? Boolean(photoFile)
        : mode === "link"
          ? Boolean(linkUrl.trim())
          : mode === "activity"
            ? Boolean(spaceItemId)
            : Boolean(homeworkId);

  const refresh = () => {
    router.refresh();
  };

  const upsertPost = (post: ClassPost) => {
    setPosts((current) =>
      sortClassPostsForFeed([post, ...current.filter((item) => item.id !== post.id)]),
    );
  };

  const resetComposer = () => {
    setBody("");
    setLinkUrl("");
    setLinkTitle("");
    setPinOnPost(false);
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = () => {
    setError(null);

    if (mode === "message") {
      startTransition(async () => {
        const result = await createClassAnnouncementPost({
          classId,
          body,
          pinned: pinOnPost,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        upsertPost(result.post);
        resetComposer();
        setNotice("Posted to the class stream.");
        refresh();
      });
      return;
    }

    if (mode === "link") {
      startTransition(async () => {
        const result = await createClassLinkPost({
          classId,
          body,
          linkUrl,
          linkTitle,
          pinned: pinOnPost,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        upsertPost(result.post);
        resetComposer();
        setNotice("Link shared on the class stream.");
        refresh();
      });
      return;
    }

    if (mode === "homework") {
      if (!homeworkId) {
        setError("Choose a homework assignment.");
        return;
      }
      startTransition(async () => {
        const result = await createClassHomeworkReminderPost({
          classId,
          homeworkId,
          body,
          pinned: pinOnPost,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        upsertPost(result.post);
        resetComposer();
        setNotice("Homework reminder posted.");
        refresh();
      });
      return;
    }

    if (mode === "activity") {
      if (!spaceItemId) {
        setError("Choose a Teacher Space activity.");
        return;
      }
      startTransition(async () => {
        const result = await createClassActivityPost({
          classId,
          spaceItemId,
          body,
          pinned: pinOnPost,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        upsertPost(result.post);
        resetComposer();
        setNotice("Activity shared on the class stream.");
        refresh();
      });
      return;
    }

    if (!photoFile) {
      setError("Choose a photo to share.");
      return;
    }

    const formData = new FormData();
    formData.set("classId", classId);
    formData.set("caption", body);
    formData.set("photo", photoFile);
    if (pinOnPost) formData.set("pinned", "1");

    startTransition(async () => {
      const result = await createClassPhotoPostFromForm(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      upsertPost(result.post);
      resetComposer();
      setNotice("Photo shared on the class stream.");
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
      setNotice("Post removed.");
      refresh();
    });
  };

  const handleTogglePin = (post: ClassPost) => {
    setError(null);
    const nextPinned = !post.pinnedAt;
    startTransition(async () => {
      const result = await setClassPostPinned({
        classId,
        postId: post.id,
        pinned: nextPinned,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      upsertPost(result.post);
      setNotice(nextPinned ? "Post pinned to the stream." : "Post unpinned.");
      refresh();
    });
  };

  const handleToggleGuardianVisibility = (post: ClassPost) => {
    setError(null);
    const nextVisibility =
      post.guardianVisibility === "none" ? "class_guardians" : "none";
    startTransition(async () => {
      const result = await setClassPostGuardianVisibility({
        classId,
        postId: post.id,
        visibility: nextVisibility,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      upsertPost(result.post);
      setNotice(
        nextVisibility === "class_guardians"
          ? "This update is now visible to connected guardians."
          : "This update is hidden from guardians.",
      );
      refresh();
    });
  };

  const modeButtons = [
    { id: "message" as const, label: "Message", icon: Megaphone },
    { id: "photo" as const, label: "Photo", icon: Camera },
    { id: "link" as const, label: "Link", icon: Link2 },
    { id: "homework" as const, label: "Homework", icon: BookOpenCheck },
    { id: "activity" as const, label: "Activity", icon: Gamepad2 },
  ];

  const postLabel =
    mode === "photo"
      ? "Share photo"
      : mode === "link"
        ? "Share link"
        : mode === "homework"
          ? "Post reminder"
          : mode === "activity"
            ? "Share activity"
            : "Post message";

  const previewHint =
    mode === "photo"
      ? "Pick a photo to preview how students will see it."
      : mode === "link"
        ? "Add a link to preview the student card."
        : mode === "homework"
          ? reminderHomework.length === 0
            ? "Assign homework first, then post a reminder."
            : "Choose homework to preview the reminder card."
          : mode === "activity"
            ? spaceItems.length === 0
              ? "Add an activity to your Teacher Space first."
              : "Choose an activity to preview the share card."
            : "Start typing to preview your message card.";

  return (
    <section className="space-y-5 rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Class stream
        </p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">
          Share with your classroom
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Students see these posts on their classroom Stream and Noticeboard — not on your public
          Teacher Space.
        </p>
      </div>

      {archived ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This class is archived. Unarchive it before posting again.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex flex-wrap gap-2">
              {modeButtons.map((item) => {
                const Icon = item.icon;
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setMode(item.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition ${
                      active
                        ? "bg-neutral-900 text-white"
                        : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {mode === "photo" ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Photo
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={disabled}
                    onChange={(event) => {
                      setPhotoFile(event.target.files?.[0] ?? null);
                    }}
                    className="mt-1 block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </label>
                {photoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreviewUrl}
                    alt=""
                    className="max-h-36 w-full rounded-xl object-cover"
                  />
                ) : null}
              </div>
            ) : null}

            {mode === "link" ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Link URL
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    disabled={disabled}
                    placeholder="https://…"
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                  />
                </label>
                <label className="block text-xs font-semibold text-neutral-700">
                  Link title (optional)
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(event) => setLinkTitle(event.target.value)}
                    disabled={disabled}
                    placeholder="What should students call this?"
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                  />
                </label>
              </div>
            ) : null}

            {mode === "homework" ? (
              <div className="space-y-2">
                {reminderHomework.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    No assigned homework yet. Assign something below, then come back to post a
                    reminder.
                  </p>
                ) : (
                  <label className="block text-xs font-semibold text-neutral-700">
                    Homework
                    <select
                      value={homeworkId}
                      onChange={(event) => setHomeworkId(event.target.value)}
                      disabled={disabled}
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                    >
                      {reminderHomework.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                          {item.status === "closed" ? " (closed)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ) : null}

            {mode === "activity" ? (
              <div className="space-y-2">
                {spaceItems.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    No Teacher Space activities yet. Publish one from Classes → Teacher Space, then
                    share it here for enrolled students.
                  </p>
                ) : (
                  <label className="block text-xs font-semibold text-neutral-700">
                    Teacher Space activity
                    <select
                      value={spaceItemId}
                      onChange={(event) => setSpaceItemId(event.target.value)}
                      disabled={disabled}
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                    >
                      {spaceItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ) : null}

            <label className="block text-xs font-semibold text-neutral-700">
              {mode === "photo"
                ? "Caption (optional)"
                : mode === "link"
                  ? "Note (optional)"
                  : mode === "homework"
                    ? "Reminder text (optional)"
                    : mode === "activity"
                      ? "Note (optional)"
                      : "Message"}
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={disabled}
                rows={mode === "message" ? 5 : 3}
                placeholder={
                  mode === "photo"
                    ? "Add a short caption…"
                    : mode === "link"
                      ? "Why should students open this?"
                      : mode === "homework"
                        ? selectedHomework
                          ? `Reminder: ${selectedHomework.title}`
                          : "Add a short nudge…"
                        : mode === "activity"
                          ? "Try this together…"
                          : "Share news, encouragement, or a quick reminder…"
                }
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-800">
              <input
                type="checkbox"
                checked={pinOnPost}
                disabled={disabled}
                onChange={(event) => setPinOnPost(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              <Pin className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
              Pin to top of Stream
            </label>

            <button
              type="button"
              disabled={disabled || !canPost}
              onClick={handlePost}
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "Posting…" : postLabel}
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Student preview
            </p>
            {draftPost ? (
              <ClassroomPostCard post={draftPost} tone="primary" />
            ) : (
              <div className="flex min-h-[10rem] items-center justify-center rounded-[1.5rem] border border-dashed border-neutral-300 bg-neutral-50 px-4 text-center text-sm font-medium text-neutral-500">
                {previewHint}
              </div>
            )}
          </div>
        </div>
      )}

      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          {notice}
        </p>
      ) : null}

      <div className="space-y-3 border-t border-neutral-200 pt-4">
        <h3 className="text-sm font-semibold text-neutral-900">
          Recent posts ({posts.length})
        </h3>
        {posts.length === 0 ? (
          <p className="text-sm text-neutral-600">
            Nothing posted yet. Your first message will appear on the student Stream.
          </p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id} className="relative">
                <ClassroomPostCard post={post} tone="primary" />
                {!archived ? (
                  <div className="absolute right-3 top-4 flex flex-col items-end gap-1.5">
                    <button
                      type="button"
                      disabled={disabled || post.kind === "photo"}
                      onClick={() => handleToggleGuardianVisibility(post)}
                      title={
                        post.kind === "photo"
                          ? "Student photos require private family media before guardian sharing can be enabled."
                          : undefined
                      }
                      className={`inline-flex items-center gap-1 rounded-full border bg-white/95 px-2.5 py-1 text-[11px] font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                        post.guardianVisibility === "none"
                          ? "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      }`}
                    >
                      <UsersRound className="h-3 w-3" aria-hidden />
                      {post.kind === "photo"
                        ? "Parents: private media needed"
                        : post.guardianVisibility === "none"
                          ? "Share with parents"
                          : "Parents: visible"}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleTogglePin(post)}
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {post.pinnedAt ? (
                        <>
                          <PinOff className="h-3 w-3" aria-hidden />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="h-3 w-3" aria-hidden />
                          Pin
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDelete(post.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Delete
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
