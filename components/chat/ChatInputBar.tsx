import { useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { THEME } from "@/lib/theme";

interface ChatInputBarProps {
  onSend: (text: string) => void;
  sending: boolean;
}

export function ChatInputBar({ onSend, sending }: ChatInputBarProps) {
  const [text, setText] = useState("");
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const trimmed = text.trim();

  const handleSend = () => {
    if (!trimmed || sending) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <View className="flex-row items-center gap-2 px-4 py-3 border-t border-border bg-card">
      <TextInput
        className="flex-1 bg-muted rounded-2xl px-4 py-2 text-foreground max-h-24"
        placeholder="Napište zprávu..."
        placeholderTextColor={isDark ? THEME.dark.mutedForeground : THEME.light.mutedForeground}
        value={text}
        onChangeText={setText}
        multiline
        editable={!sending}
      />
      <Pressable
        onPress={handleSend}
        disabled={!trimmed || sending}
        className={`w-10 h-10 rounded-full items-center justify-center ${
          trimmed && !sending ? "bg-primary" : "bg-muted"
        }`}
      >
        <Ionicons
          name="send"
          size={18}
          color={trimmed && !sending
            ? (isDark ? THEME.dark.primaryForeground : THEME.light.primaryForeground)
            : (isDark ? THEME.dark.mutedForeground : THEME.light.mutedForeground)
          }
        />
      </Pressable>
    </View>
  );
}
