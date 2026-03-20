import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "./text";
import { Ionicons } from "@expo/vector-icons";

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
}

export function Switch({
  value,
  onValueChange,
  disabled = false,
  label,
  description,
  leftIcon,
  rightIcon,
}: SwitchProps) {
  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <View className="flex-row justify-between items-center">
      {label && (
        <View className="flex-1 mr-3">
          <Text className="text-base">{label}</Text>
          {description && (
            <Text className="text-xs text-muted-foreground">{description}</Text>
          )}
        </View>
      )}

      <View className="flex-row items-center gap-2">
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={16}
            className="text-muted-foreground"
          />
        )}
        <Pressable
          className={`w-11 h-6 rounded-full p-0.5 justify-center ${
            value ? "bg-primary" : "bg-border"
          } ${disabled ? "opacity-50" : ""}`}
          onPress={handlePress}
          disabled={disabled}
        >
          <View
            className={`w-5 h-5 rounded-full bg-white ${
              value ? "self-end" : "self-start"
            }`}
          />
        </Pressable>
        {rightIcon && (
          <Ionicons
            name={rightIcon}
            size={16}
            className="text-muted-foreground"
          />
        )}
      </View>
    </View>
  );
}
