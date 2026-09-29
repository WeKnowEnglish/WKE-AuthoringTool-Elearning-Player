"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import {
  markTeacherConversationRead,
  sendTeacherMessage,
  startTeacherConversation,
} from "@/lib/actions/teacher-messaging";
import type { TeacherMessagingPageData } from "@/lib/data/teacher-messaging";
import { createClient } from "@/lib/supabase/client";

function messageTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TeacherMessagesClient({ data }: { data: TeacherMessagingPageData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [otherUserId, setOtherUserId] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(data.error);
  const selectedId = data.selectedConversation?.id ?? null;

  const selectedName = data.selectedConversation?.otherTeacher?.displayName ?? "Teacher";
  const selectedProfileById = useMemo(
    () => new Map(data.directory.map((profile) => [profile.userId, profile])),
    [data.directory],
  );

  useEffect(() => {
    if (!selectedId) return;
    void markTeacherConversationRead(selectedId);
    const supabase = createClient();
    const channel = supabase
      .channel(`teacher-messages:${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "teacher_messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        () => {
          void markTeacherConversationRead(selectedId);
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, selectedId]);

  const beginConversation = () => {
    if (!otherUserId) return;
    setError(null);
    startTransition(async () => {
      const result = await startTeacherConversation({ otherUserId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOtherUserId("");
      router.push(`/teacher/messages?conversation=${result.conversationId}`);
      router.refresh();
    });
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId || !body.trim()) return;
    const submittedBody = body;
    setError(null);
    startTransition(async () => {
      const result = await sendTeacherMessage({ conversationId: selectedId, body: submittedBody });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid min-h-[32rem] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm md:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="border-b border-neutral-200 md:border-b-0 md:border-r">
          <div className="space-y-2 border-b border-neutral-200 p-3">
            <label className="block text-xs font-bold uppercase tracking-wide text-neutral-500">
              New message
            </label>
            <div className="flex gap-2">
              <select
                value={otherUserId}
                onChange={(event) => setOtherUserId(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-2 text-sm"
                aria-label="Choose a teacher"
              >
                <option value="">Choose teacher…</option>
                {data.directory.map((teacher) => (
                  <option key={teacher.userId} value={teacher.userId}>
                    {teacher.displayName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!otherUserId || pending}
                onClick={beginConversation}
                className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                Open
              </button>
            </div>
          </div>

          <nav aria-label="Conversations" className="max-h-80 overflow-y-auto md:max-h-[31rem]">
            {data.conversations.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">No conversations yet.</p>
            ) : (
              data.conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/teacher/messages?conversation=${conversation.id}`}
                  className={`block border-b border-neutral-100 px-3 py-3 hover:bg-neutral-50 ${
                    conversation.id === selectedId ? "bg-teal-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-neutral-900">
                      {conversation.otherTeacher?.displayName ?? "Teacher"}
                    </span>
                    {conversation.unread ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-teal-600" aria-label="Unread" />
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-500">
                    {conversation.lastMessage?.body ?? "Start the conversation"}
                  </p>
                </Link>
              ))
            )}
          </nav>
        </aside>

        <section className="flex min-h-[28rem] min-w-0 flex-col">
          {data.selectedConversation ? (
            <>
              <header className="border-b border-neutral-200 px-4 py-3">
                <h2 className="font-bold text-neutral-900">{selectedName}</h2>
                <p className="text-xs text-neutral-500">Private teacher conversation</p>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {data.messages.length === 0 ? (
                  <p className="text-center text-sm text-neutral-500">
                    Send the first message. Keep it useful, professional, and focused on teaching.
                  </p>
                ) : (
                  data.messages.map((message) => {
                    const mine = message.senderId === data.currentUserId;
                    const sender = selectedProfileById.get(message.senderId)?.displayName;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            mine ? "bg-teal-700 text-white" : "bg-neutral-100 text-neutral-900"
                          }`}
                        >
                          {!mine && sender ? <p className="mb-1 text-xs font-bold">{sender}</p> : null}
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          <p className={`mt-1 text-[10px] ${mine ? "text-teal-100" : "text-neutral-500"}`}>
                            {messageTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form onSubmit={submitMessage} className="border-t border-neutral-200 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    maxLength={4000}
                    rows={2}
                    placeholder={`Message ${selectedName}`}
                    className="min-w-0 flex-1 resize-none rounded-xl border border-neutral-300 px-3 py-2 text-sm"
                    aria-label={`Message ${selectedName}`}
                  />
                  <button
                    type="submit"
                    disabled={pending || !body.trim()}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-neutral-500">
              Choose a teacher to start a private conversation.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
