import "server-only";

import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type TeacherDirectoryProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

export type TeacherMessageView = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type TeacherConversationSummary = {
  id: string;
  otherTeacher: TeacherDirectoryProfile | null;
  lastMessage: TeacherMessageView | null;
  lastMessageAt: string | null;
  unread: boolean;
};

export type TeacherMessagingPageData = {
  currentUserId: string;
  directory: TeacherDirectoryProfile[];
  conversations: TeacherConversationSummary[];
  selectedConversation: TeacherConversationSummary | null;
  messages: TeacherMessageView[];
  error: string | null;
};

function fallbackDisplayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim().slice(0, 80);
  }
  return (user.email?.split("@")[0]?.trim() || "Teacher").slice(0, 80);
}

function mapMessage(row: Record<string, unknown>): TeacherMessageView {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderId: String(row.sender_id),
    body: String(row.body),
    createdAt: String(row.created_at),
  };
}

export async function getTeacherMessagingPageData(
  requestedConversationId?: string,
): Promise<TeacherMessagingPageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) return null;

  const empty: TeacherMessagingPageData = {
    currentUserId: user.id,
    directory: [],
    conversations: [],
    selectedConversation: null,
    messages: [],
    error: null,
  };

  const ownProfile = await supabase.from("teacher_profiles").upsert(
    {
      user_id: user.id,
      display_name: fallbackDisplayName(user),
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (ownProfile.error) {
    return {
      ...empty,
      error: `${ownProfile.error.message}. Apply migration 153 before using teacher messages.`,
    };
  }

  const [{ data: profileRows, error: profilesError }, { data: membershipRows, error: membershipError }] =
    await Promise.all([
      supabase
        .from("teacher_profiles")
        .select("user_id, display_name, avatar_url")
        .neq("user_id", user.id)
        .eq("directory_visible", true)
        .order("display_name"),
      supabase
        .from("teacher_conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id)
        .is("archived_at", null),
    ]);

  if (profilesError || membershipError) {
    return {
      ...empty,
      error: profilesError?.message ?? membershipError?.message ?? "Could not load teacher messages.",
    };
  }

  const directory: TeacherDirectoryProfile[] = (profileRows ?? []).map((row) => ({
    userId: String(row.user_id),
    displayName: String(row.display_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  }));
  const conversationIds = (membershipRows ?? []).map((row) => String(row.conversation_id));
  if (conversationIds.length === 0) return { ...empty, directory };

  const [{ data: conversationRows, error: conversationsError }, { data: memberRows, error: membersError }, { data: recentMessageRows, error: messagesError }] =
    await Promise.all([
      supabase
        .from("teacher_conversations")
        .select("id, last_message_at, updated_at")
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("teacher_conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds),
      supabase
        .from("teacher_messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  if (conversationsError || membersError || messagesError) {
    return {
      ...empty,
      directory,
      error:
        conversationsError?.message ??
        membersError?.message ??
        messagesError?.message ??
        "Could not load conversations.",
    };
  }

  const allMemberIds = Array.from(
    new Set((memberRows ?? []).map((row) => String(row.user_id))),
  );
  const profileById = new Map<string, TeacherDirectoryProfile>();
  if (allMemberIds.length > 0) {
    const { data: allProfiles } = await supabase
      .from("teacher_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", allMemberIds);
    for (const row of allProfiles ?? []) {
      profileById.set(String(row.user_id), {
        userId: String(row.user_id),
        displayName: String(row.display_name),
        avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      });
    }
  }

  const lastReadByConversation = new Map(
    (membershipRows ?? []).map((row) => [
      String(row.conversation_id),
      row.last_read_at ? String(row.last_read_at) : null,
    ]),
  );
  const lastMessageByConversation = new Map<string, TeacherMessageView>();
  for (const row of recentMessageRows ?? []) {
    const message = mapMessage(row as Record<string, unknown>);
    if (!lastMessageByConversation.has(message.conversationId)) {
      lastMessageByConversation.set(message.conversationId, message);
    }
  }

  const conversations: TeacherConversationSummary[] = (conversationRows ?? []).map((row) => {
    const id = String(row.id);
    const otherMemberId = (memberRows ?? [])
      .filter((member) => String(member.conversation_id) === id)
      .map((member) => String(member.user_id))
      .find((memberId) => memberId !== user.id);
    const lastMessage = lastMessageByConversation.get(id) ?? null;
    const lastReadAt = lastReadByConversation.get(id);
    return {
      id,
      otherTeacher: otherMemberId ? profileById.get(otherMemberId) ?? null : null,
      lastMessage,
      lastMessageAt: row.last_message_at ? String(row.last_message_at) : null,
      unread:
        lastMessage !== null &&
        lastMessage.senderId !== user.id &&
        (!lastReadAt || new Date(lastMessage.createdAt) > new Date(lastReadAt)),
    };
  });

  const selectedConversation =
    conversations.find((conversation) => conversation.id === requestedConversationId) ??
    conversations[0] ??
    null;
  let messages: TeacherMessageView[] = [];
  if (selectedConversation) {
    const { data, error } = await supabase
      .from("teacher_messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", selectedConversation.id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) return { ...empty, directory, conversations, error: error.message };
    messages = (data ?? []).map((row) => mapMessage(row as Record<string, unknown>));
  }

  return {
    currentUserId: user.id,
    directory,
    conversations,
    selectedConversation,
    messages,
    error: null,
  };
}
