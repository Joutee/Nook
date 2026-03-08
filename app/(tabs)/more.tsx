import { View, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { router } from "expo-router/build/exports";
import { Ionicons } from "@expo/vector-icons";

const more = () => {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-5 gap-6">
        {/* Funkce */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Funkce
          </Text>

          <Card className="gap-0 py-0">
            {/* Dokumenty */}
            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => router.push("./documents")}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  className="text-foreground"
                />
                <Text className="text-base">Dokumenty</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>

            <Separator />

            {/* Klíče */}
            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => router.push("./keys")}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="key-outline"
                  size={24}
                  className="text-foreground"
                />
                <Text className="text-base">Klíče</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>

            <Separator />

            {/* Závady */}
            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => router.push("./issues")}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="warning-outline"
                  size={24}
                  className="text-foreground"
                />
                <Text className="text-base">Závady</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>
          </Card>
        </View>

        {/* Účet */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Účet
          </Text>

          <Card className="gap-0 py-0">
            {/* Nastavení */}
            <Button
              variant="ghost"
              className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
              onPress={() => router.push("/settings")}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="settings-outline"
                  size={24}
                  className="text-foreground"
                />
                <Text className="text-base">Nastavení</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                className="text-foreground"
              />
            </Button>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
};

export default more;
