import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";

interface PhotoPickerTilesProps {
  onTakePhoto: () => void;
  onPickGallery: () => void;
}

export function PhotoPickerTiles({
  onTakePhoto,
  onPickGallery,
}: PhotoPickerTilesProps) {
  return (
    <View className="flex-row justify-between">
      <Pressable
        className="w-[48%] rounded-lg p-3 items-center bg-secondary active:opacity-60"
        onPress={onTakePhoto}
      >
        <Ionicons name="camera-outline" size={22} className="text-foreground" />
        <Text className="mt-1 text-sm text-foreground font-semibold">
          Vyfotit
        </Text>
      </Pressable>
      <Pressable
        className="w-[48%] rounded-lg p-3 items-center bg-secondary active:opacity-60"
        onPress={onPickGallery}
      >
        <Ionicons name="images-outline" size={22} className="text-foreground" />
        <Text className="mt-1 text-sm text-foreground font-semibold">
          Z galerie
        </Text>
      </Pressable>
    </View>
  );
}
