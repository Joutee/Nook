import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  const senderName = [message.sender.name, message.sender.surname].filter(Boolean).join(" ");

  return (
    <View className={`${showSender ? "mt-3" : "mt-0.5"}`}>
      {/* Sender name */}
      {showSender && !isOwn && (
        <Text className="text-xs text-muted-foreground mb-1 ml-11">
          {senderName}
        </Text>
      )}

      {/* Row: constrain width via padding on the opposite side */}
      <View
        className={`flex-row ${isOwn ? "justify-end" : "justify-start"}`}
        style={isOwn ? { paddingLeft: "25%" } : { paddingRight: "25%" }}
      >
        {/* Avatar */}
        {!isOwn && (
          <View className="w-8 mr-2 justify-end">
            {showSender && (
              <Avatar
                name={senderName}
                imageUrl={message.sender.avatar_url}
                size="lg"
              />
            )}
          </View>
        )}

        {/* Bubble — no maxWidth, constrained by row padding instead */}
        <View
          className={`px-3 py-2 rounded-2xl overflow-visible ${
            isOwn
              ? "bg-primary rounded-br-sm"
              : "bg-muted rounded-bl-sm"
          }`}
        >
          <Text
            className={isOwn ? "text-primary-foreground" : "text-foreground"}
            textBreakStrategy="simple"
            style={{ marginRight: 4 }}
          >
            {message.content}
          </Text>
        </View>
      </View>

      {/* Timestamp */}
      <Text className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? "text-right mr-1" : "ml-11"}`}>
        {formatTime(message.created_at)}
      </Text>
    </View>
  );
}
