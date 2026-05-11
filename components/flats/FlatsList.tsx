import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { useFlatContext } from "@/contexts/FlatContext";

interface FlatsListProps {
  onFlatSelect?: () => void;
}

export const FlatsList: React.FC<FlatsListProps> = ({ onFlatSelect }) => {
  const { flats, currentFlat, setCurrentFlat } = useFlatContext();

  const handleSelectFlat = (flat: {
    id: string;
    name: string;
    address: string;
  }) => {
    if (currentFlat?.id === flat.id) {
      onFlatSelect?.();
      return;
    }

    setCurrentFlat(flat);
    onFlatSelect?.();
  };

  if (flats.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        Nejste členem žádného bytu
      </Text>
    );
  }

  return (
    <View>
      {flats.map((flat) => (
        <Pressable
          key={flat.id}
          className={`flex-row items-center py-3 px-3 bg-card border border-border rounded-lg mb-2 gap-3 ${
            currentFlat?.id === flat.id
              ? "bg-primary/10 border-primary"
              : "border-border"
          }`}
          onPress={() => handleSelectFlat(flat)}
        >
          <View className="flex-row items-center flex-1">
            <Text
              className="text-sm text-foreground font-medium flex-1"
              numberOfLines={2}
            >
              {flat.name || flat.address}
            </Text>
          </View>
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              currentFlat?.id === flat.id ? "border-primary" : "border-border"
            }`}
          >
            {currentFlat?.id === flat.id && (
              <View className="w-3 h-3 rounded-full bg-primary" />
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
};
