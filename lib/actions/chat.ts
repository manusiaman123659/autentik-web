"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { recordAudit } from "@/lib/audit";
import { csChatMessageSchema } from "@/lib/validations/csChatSchema";
import type { ActionResult } from "./products";

export interface ChatMessageRow {
  id: string;
  conversation_id: string;
  sender_role: "visitor" | "staff";
  sender_name?: string | null;
  body: string;
  created_at: string;
}

const revalidateChat = (conversationId: string) => {
  revalidatePath("/admin/chat");
  revalidatePath(`/admin/chat/${conversationId}`);
  revalidatePath("/admin");
};

async function broadcastStaffReply(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  channelToken: string | null,
  payload: { body: string; sender_name: string | null; created_at: string }
) {
  if (!channelToken) {
    console.warn("[chat] broadcast dilewati: broadcast_token tidak ditemukan");
    return;
  }
  try {
    const supabase = createClient(cookieStore);
    const channel = supabase.channel(`conversation:${channelToken}`);
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const timer = setTimeout(finish, 5000);
      channel
        .on("broadcast", { event: "reply" }, () => {})
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel
              .send({ type: "broadcast", event: "reply", payload })
              .then(() => {
                clearTimeout(timer);
                finish();
              })
              .catch(() => {
                clearTimeout(timer);
                finish();
              });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            clearTimeout(timer);
            finish();
          }
        });
    });
    await supabase.removeChannel(channel).catch(() => {});
  } catch (err) {
    console.error("[chat] broadcast staf gagal", err);
  }
}

export async function sendStaffReply(
  conversationId: string,
  message: string
): Promise<ActionResult & { data?: ChatMessageRow }> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = csChatMessageSchema.safeParse({ message });
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: row, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_role: "staff",
      sender_name: admin.fullName ?? admin.email,
      body: parsed.data.message,
    })
    .select("*")
    .single();

  if (error || !row) {
    console.error("[action] send staff reply", error);
    return { success: false, message: "Gagal mengirim balasan. " + (error?.message ?? "") };
  }

  const messageRow = row as ChatMessageRow;

  await supabase
    .from("chat_conversations")
    .update({
      last_message_at: messageRow.created_at,
      last_read_at: messageRow.created_at,
      status: "open",
    })
    .eq("id", conversationId);

  const tokenRes = await supabase
    .from("chat_conversations")
    .select("broadcast_token")
    .eq("id", conversationId)
    .maybeSingle();
  const broadcastToken = (tokenRes.data?.broadcast_token as string | undefined) ?? null;

  await broadcastStaffReply(cookieStore, broadcastToken, {
    body: messageRow.body,
    sender_name: messageRow.sender_name ?? null,
    created_at: messageRow.created_at,
  });

  await recordAudit("chat.replied", "chat_conversation", conversationId, {
    preview: messageRow.body.slice(0, 80),
  });
  revalidateChat(conversationId);

  return { success: true, message: "Balasan terkirim.", data: messageRow };
}

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("chat_conversations")
    .update({ last_read_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) {
    console.error("[action] mark conversation read", error);
    return { success: false, message: "Gagal memperbarui status. " + error.message };
  }

  revalidateChat(conversationId);
  return { success: true, message: "Percakapan ditandai dibaca." };
}

export async function setConversationStatus(
  conversationId: string,
  status: "open" | "resolved"
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("chat_conversations")
    .update({ status })
    .eq("id", conversationId);

  if (error) {
    console.error("[action] set conversation status", error);
    return { success: false, message: "Gagal mengganti status. " + error.message };
  }

  await recordAudit("chat.status_changed", "chat_conversation", conversationId, { status });
  revalidateChat(conversationId);

  return {
    success: true,
    message: status === "resolved" ? "Percakapan ditandai selesai." : "Percakapan dibuka kembali.",
  };
}