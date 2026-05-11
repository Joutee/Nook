import { Text as RNText, useWindowDimensions, View } from "react-native";
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
  const { width } = useWindowDimensions();
  const bubbleMaxWidth = Math.floor(width * 0.7);

  return (
    <View className={`${showSender ? "mt-3" : "mt-0.5"}`}>
      {showSender && !isOwn && (
        <Text className="text-xs text-muted-foreground mb-1 ml-11">
          {senderName}
        </Text>
      )}

      <View
        className={`w-full ${isOwn ? "items-end" : "flex-row items-end"}`}
        style={isOwn ? { paddingRight: 12 } : { paddingLeft: 12 }}
      >
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

        <View
          className={`px-3 py-2 rounded-2xl ${
            isOwn
              ? "bg-primary rounded-br-sm"
              : "bg-muted rounded-bl-sm"
          }`}
          style={{
            maxWidth: bubbleMaxWidth,
            alignSelf: isOwn ? "flex-end" : "flex-start",
            overflow: "visible",
          }}
        >
          <RNText
            className={`text-base ${
              isOwn ? "text-primary-foreground" : "text-foreground"
            }`}
            style={{
              includeFontPadding: true,
              flexShrink: 1,
            }}
            textBreakStrategy="simple"
          >
            {message.content + " "}
          </RNText>
        </View>
      </View>

      <Text className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? "text-right mr-1" : "ml-11"}`}>
        {formatTime(message.created_at)}
      </Text>
    </View>
  );
}
