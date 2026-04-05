import { View } from "react-native";
import { Avatar } from "@/components/ui/avatar";

interface ReadReceiptUser {
  id: string;
  name: string;
  surname: string | null;
  avatar_url: string | null;
}

interface ReadReceiptsProps {
  readers: ReadReceiptUser[];
  isOwn: boolean;
}

export function ReadReceipts({ readers, isOwn }: ReadReceiptsProps) {
  if (readers.length === 0) return null;

  return (
    <View className={`flex-row gap-0.5 mt-0.5 ${isOwn ? "justify-end mr-1" : "justify-start ml-11"}`}>
      {readers.map((reader) => (
        <Avatar
          key={reader.id}
          name={[reader.name, reader.surname].filter(Boolean).join(" ")}
          imageUrl={reader.avatar_url}
          size="xs"
        />
      ))}
    </View>
  );
}
