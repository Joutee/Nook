import { supabase } from "@/lib/supabase";
import { Message, MessageRead } from "@/types/chat";

const MESSAGE_PAGE_SIZE = 50;

const MESSAGE_SELECT = `
  id, flat_id, sender_id, content, created_at,
  sender:profiles!messages_sender_id_fkey(id, name, surname, avatar_url)
`;

/**
 * Fetch messages for a flat, ordered newest first.
 * Pass `before` (ISO timestamp) to paginate older messages.
 */
export async function fetchMessages(
  flatId: string,
  before?: string
): Promise<Message[]> {
  let query = supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("flat_id", flatId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as Message[]) ?? [];
}

/**
 * Send a message to a flat.
 */
export async function sendMessage(
  flatId: string,
  senderId: string,
  content: string
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ flat_id: flatId, sender_id: senderId, content })
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as Message;
}

/**
 * Update read receipt — marks chat as read up to now.
 */
export async function markChatAsRead(
  profileId: string,
  flatId: string
): Promise<void> {
  const { error } = await supabase
    .from("message_reads")
    .upsert(
      { profile_id: profileId, flat_id: flatId, last_read_at: new Date().toISOString() },
      { onConflict: "profile_id,flat_id" }
    );

  if (error) throw error;
}

/**
 * Fetch read receipts for all members of a flat.
 */
export async function fetchReadReceipts(
  flatId: string
): Promise<(MessageRead & { profile: { id: string; name: string; surname: string | null; avatar_url: string | null } })[]> {
  const { data, error } = await supabase
    .from("message_reads")
    .select("profile_id, flat_id, last_read_at, profile:profiles!message_reads_profile_id_fkey(id, name, surname, avatar_url)")
    .eq("flat_id", flatId);

  if (error) throw error;
  return (data as any) ?? [];
}

/**
 * Get unread message count for a flat.
 */
export async function getUnreadCount(
  flatId: string,
  profileId: string
): Promise<number> {
  // First get user's last_read_at
  const { data: readData } = await supabase
    .from("message_reads")
    .select("last_read_at")
    .eq("flat_id", flatId)
    .eq("profile_id", profileId)
    .single();

  let query = supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("flat_id", flatId);

  if (readData?.last_read_at) {
    query = query.gt("created_at", readData.last_read_at);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
