import React from "react";
import { Modal, View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useToast } from "../contexts/ToastContext";

interface CodeModalProps {
  visible: boolean;
  code: string;
  onClose: () => void;
}

export default function CodeModal({ visible, code, onClose }: CodeModalProps) {
  const { showToast } = useToast();

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(code);
    showToast("Kód byl zkopírován do schránky", "success");
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center p-5"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-md"
          onPress={(e) => e.stopPropagation()}
        >
          <Card>
            <CardHeader className="items-center">
              <View className="mb-4">
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  className="text-primary"
                />
              </View>
              <CardTitle className="text-2xl text-center">
                Byt byl úspěšně vytvořen!
              </CardTitle>
              <CardDescription className="text-center">
                Sdílejte tento kód s ostatními, aby se mohli připojit k bytu.
              </CardDescription>
            </CardHeader>

            <CardContent className="gap-4">
              <View className="bg-muted border-2 border-primary rounded-xl p-5 items-center">
                <Text className="text-xs text-muted-foreground mb-2 uppercase tracking-wide text-center w-full">
                  Kód pro připojení
                </Text>
                <Text className="text-4xl font-bold text-primary tracking-[4px]">
                  {code}
                </Text>
              </View>

              <Button
                variant="outline"
                onPress={handleCopyCode}
                className="flex-row gap-2"
              >
                <Ionicons
                  name="copy-outline"
                  size={20}
                  className="text-primary"
                />
                <Text>Zkopírovat kód</Text>
              </Button>

              <Button onPress={onClose}>
                <Text>Zavřít</Text>
              </Button>
            </CardContent>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
