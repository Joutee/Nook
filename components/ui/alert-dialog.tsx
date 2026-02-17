import React from "react";
import { Modal, View, Pressable } from "react-native";
import { Card } from "./card";
import { Text } from "./text";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface CustomAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelText?: string;
  actionText?: string;
  onAction: () => void;
  destructive?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText = "Zrušit",
  actionText = "Potvrdit",
  onAction,
  destructive = false,
}: CustomAlertDialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      {/* Overlay */}
      <Pressable
        className="flex-1 bg-black/75 items-center justify-center p-4"
        onPress={() => onOpenChange(false)}
      >
        {/* Dialog Content */}
        <Pressable
          className="w-72 max-w-[600px]"
          onPress={(e) => e.stopPropagation()}
        >
          <Card className="w-full max-w-[600px] gap-4 py-6">
            {/* Header */}
            <View className="px-6 gap-2">
              <Text className="text-lg font-semibold text-foreground">
                {title}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {description}
              </Text>
            </View>

            {/* Footer - Buttons */}
            <View className="px-6 flex-row gap-3 justify-end">
              <Button
                variant="secondary"
                onPress={() => onOpenChange(false)}
                className="flex-1"
              >
                <Text>{cancelText}</Text>
              </Button>
              <Button
                variant={destructive ? "destructive" : "default"}
                onPress={() => {
                  onAction();
                  onOpenChange(false);
                }}
                className="flex-1"
              >
                <Text>{actionText}</Text>
              </Button>
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
