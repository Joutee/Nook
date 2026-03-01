import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScaleDecorator } from "react-native-draggable-flatlist";
import { WIDGET_NAMES, WIDGET_ICONS } from "../config/widgetConfig";

interface WidgetReorderItemProps {
  widgetKey: string;
  isHidden: boolean;
  onToggleVisibility: () => void;
  drag: () => void;
  isActive: boolean;
}

export const WidgetReorderItem: React.FC<WidgetReorderItemProps> = ({
  widgetKey,
  isHidden,
  onToggleVisibility,
  drag,
  isActive,
}) => {
  return (
    <ScaleDecorator>
      <View style={{ opacity: isActive ? 0.7 : 1, paddingHorizontal: 16 }}>
        <Card className={`mb-3 py-3 ${isHidden ? "opacity-60" : ""}`}>
          <CardContent className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Ionicons
                name={WIDGET_ICONS[widgetKey] || "apps-outline"}
                size={24}
                className="text-foreground"
                style={{ marginRight: 12 }}
              />
              <Text className="text-base font-semibold text-foreground">
                {WIDGET_NAMES[widgetKey] || widgetKey}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={onToggleVisibility}>
                <Ionicons
                  name={isHidden ? "eye-outline" : "eye-off-outline"}
                  size={24}
                  className="text-muted-foreground"
                />
              </Pressable>
              <Pressable
                onLongPress={drag}
                delayLongPress={150}
                disabled={isActive}
              >
                <Ionicons
                  name="reorder-three-outline"
                  size={24}
                  className="text-muted-foreground"
                />
              </Pressable>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScaleDecorator>
  );
};
