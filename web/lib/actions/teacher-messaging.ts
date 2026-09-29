"use server";

import { z } from "zod";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

const uuidSchema = z.string().uuid();
const messageBodySchema = z.string().trim().min(1).max(4000);

async function teacherContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) return null;
  return { supabase, userId: user.id };
}
export async function startTeacherConversation(input: { otherUserId: string }): Promise<
  { ok: true; conversationId: string } | { ok: false; error: string }
> {
  const parsed = uuidSchema.safeParse(input.otherUserId);
  if (!parsed.success) return { ok: false, error: "Choose a teacher." };
  const ctx = await teacherContext();
  if (!ctx) return { ok: false, error: "Teacher authentication required." };

  const { data, error } = await ctx.supabase.rpc("get_or_create_teacher_direct_conversation", {
    p_other_user_id: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  if (typeof data !== "string") return { ok: false, error: "Could not open the conversation." };
  return { ok: true, conversationId: data };
}

export async function sendTeacherMessage(input: {
  conversationId: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const conversationId = uuidSchema.safeParse(input.conversationId);
  const body = messageBodySchema.safeParse(input.body);
  if (!conversationId.success) return { ok: false, error: "Conversation not found." };
  if (!body.success) return { ok: false, error: "Write a message of up to 4,000 characters." };
  const ctx = await teacherContext();
  if (!ctx) return { ok: false, error: "Teacher authentication required." };

  const { error } = await ctx.supabase.from("teacher_messages").insert({
    conversation_id: conversationId.data,
    sender_id: ctx.userId,
    body: body.data,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markTeacherConversationRead(conversationId: string): Promise<void> {
  const parsed = uuidSchema.safeParse(conversationId);
  if (!parsed.success) return;
  const ctx = await teacherContext();
  if (!ctx) return;
  await ctx.supabase.rpc("mark_teacher_conversation_read", {
    p_conversation_id: parsed.data,
  });
}
