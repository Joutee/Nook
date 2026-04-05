import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import {
  fetchMessages,
  sendMessage,
  markChatAsRead,
  fetchReadReceipts,
} from "@/lib/chatService";
import { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { ReadReceipts } from "./ReadReceipts";
import { ChatInputBar } from "./ChatInputBar";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator } from "react-native";

interface ReadReceiptUser {
  id: string;
  name: string;
  surname: string | null;
  avatar_url: string | null;
  last_read_at: string;
}

export function ChatScreen() {
  const { currentFlat } = useFlatContext();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [readReceipts, setReadReceipts] = useState<ReadReceiptUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const flatId = currentFlat?.id;

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Load messages and read receipts on focus
  useFocusEffect(
    useCallback(() => {
      if (!flatId || !userId) return;

      const load = async () => {
        setLoading(true);
        try {
          const [msgs, receipts] = await Promise.all([
            fetchMessages(flatId),
            fetchReadReceipts(flatId),
          ]);
          setMessages(msgs);
          setReadReceipts(
            receipts.map((r) => ({
              id: r.profile.id,
              name: r.profile.name,
              surname: r.profile.surname,
              avatar_url: r.profile.avatar_url,
              last_read_at: r.last_read_at,
            }))
          );
          setHasMore(msgs.length >= 50);
          // Mark as read
          await markChatAsRead(userId, flatId);
        } catch {
          showToast("Nepodařilo se načíst zprávy", "error");
        } finally {
          setLoading(false);
        }
      };

      load();
    }, [flatId, userId])
  );

  // Realtime subscription
  useEffect(() => {
    if (!flatId || !userId) return;

    const channel = supabase
      .channel(`chat:${flatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `flat_id=eq.${flatId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;

          // Fetch the full message with sender join
          const { data } = await supabase
            .from("messages")
            .select("id, flat_id, sender_id, content, created_at, sender:profiles!messages_sender_id_fkey(id, name, surname, avatar_url)")
            .eq("id", newMsg.id)
            .single();

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [data as unknown as Message, ...prev];
            });
          }

          // Mark as read since chat is open
          await markChatAsRead(userId, flatId);
          // Refresh read receipts
          const receipts = await fetchReadReceipts(flatId);
          setReadReceipts(
            receipts.map((r) => ({
              id: r.profile.id,
              name: r.profile.name,
              surname: r.profile.surname,
              avatar_url: r.profile.avatar_url,
              last_read_at: r.last_read_at,
            }))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [flatId, userId]);

  // Load older messages
  const loadMore = async () => {
    if (loadingMore || !hasMore || !flatId || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[messages.length - 1];
      const older = await fetchMessages(flatId, oldest.created_at);
      setMessages((prev) => [...prev, ...older]);
      setHasMore(older.length >= 50);
    } catch {
      showToast("Nepodařilo se načíst starší zprávy", "error");
    } finally {
      setLoadingMore(false);
    }
  };

  // Send message with optimistic update
  const handleSend = async (content: string) => {
    if (!flatId || !userId) return;
    setSending(true);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      flat_id: flatId,
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      sender: { id: userId, name: "", surname: null, avatar_url: null },
    };
    setMessages((prev) => [optimisticMsg, ...prev]);

    try {
      const saved = await sendMessage(flatId, userId, content);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? saved : m))
      );
      await markChatAsRead(userId, flatId);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      showToast("Zprávu se nepodařilo odeslat", "error");
    } finally {
      setSending(false);
    }
  };

  // Grouping logic
  const shouldShowSender = (index: number): boolean => {
    const msg = messages[index];
    const nextMsg = messages[index + 1];
    if (!nextMsg) return true;
    if (nextMsg.sender_id !== msg.sender_id) return true;
    const diff = new Date(msg.created_at).getTime() - new Date(nextMsg.created_at).getTime();
    return diff > 5 * 60 * 1000;
  };

  // Read receipt positions
  const readerPositions = new Map<string, string>();
  if (messages.length > 0) {
    for (const reader of readReceipts) {
      if (reader.id === userId) continue;
      for (const msg of messages) {
        if (new Date(reader.last_read_at) >= new Date(msg.created_at)) {
          const existing = readerPositions.get(msg.id) || "";
          readerPositions.set(msg.id, existing ? `${existing},${reader.id}` : reader.id);
          break;
        }
      }
    }
  }

  const getReadersAtMessage = (messageId: string) => {
    const readerIds = readerPositions.get(messageId)?.split(",") ?? [];
    return readReceipts.filter((r) => readerIds.includes(r.id));
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {messages.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-lg text-muted-foreground text-center">
            Zatím žádné zprávy
          </Text>
          <Text className="text-sm text-muted-foreground text-center mt-2">
            Zahajte konverzaci s ostatními členy bytu
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isOwn = item.sender_id === userId;
            const showSender = shouldShowSender(index);
            const readers = getReadersAtMessage(item.id);

            return (
              <View>
                <MessageBubble
                  message={item}
                  isOwn={isOwn}
                  showSender={showSender}
                />
                {readers.length > 0 && (
                  <ReadReceipts readers={readers} isOwn={isOwn} />
                )}
              </View>
            );
          }}
        />
      )}

      <ChatInputBar onSend={handleSend} sending={sending} />
    </KeyboardAvoidingView>
  );
}
