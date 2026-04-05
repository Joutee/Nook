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
        className="w-[48%] border-2 border-primary rounded-lg p-5 items-center bg-secondary active:opacity-60"
        onPress={onTakePhoto}
      >
        <Ionicons name="camera" size={32} className="text-primary" />
        <Text className="mt-2 text-base text-primary font-semibold">
          Vyfotit
        </Text>
      </Pressable>
      <Pressable
        className="w-[48%] border-2 border-primary rounded-lg p-5 items-center bg-secondary active:opacity-60"
        onPress={onPickGallery}
      >
        <Ionicons name="images" size={32} className="text-primary" />
        <Text className="mt-2 text-base text-primary font-semibold">
          Z galerie
        </Text>
      </Pressable>
    </View>
  );
}
