import { View, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { router } from "expo-router/build/exports";
import { Ionicons } from "@expo/vector-icons";
import { useFlatContext } from "@/contexts/FlatContext";

interface MenuItem {
  label: string;
  icon: string;
  onPress: () => void;
}

const more = () => {
  const { userRole } = useFlatContext();
  const isTenant = userRole !== "pronajimatel";

  const tenantItems: MenuItem[] = [
    { label: "Chat", icon: "chatbubbles-outline", onPress: () => router.push("/chat") },
    { label: "Dokumenty", icon: "document-text-outline", onPress: () => router.push("./documents") },
    { label: "Klíče", icon: "key-outline", onPress: () => router.push("./keys") },
    { label: "Závady", icon: "warning-outline", onPress: () => router.push("./issues") },
  ];

  const landlordItems: MenuItem[] = [
    { label: "Klíče", icon: "key-outline", onPress: () => router.push("./keys") },
    { label: "Dokumenty", icon: "document-text-outline", onPress: () => router.push("./documents") },
  ];

  const functionItems = isTenant ? tenantItems : landlordItems;

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-5 gap-6">
        {/* Funkce */}
        <View className="gap-2">
          <Text className="text-xs font-semibold text-muted-foreground uppercase ml-1">
            Funkce
          </Text>

          <Card className="gap-0 py-0">
            {functionItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <Separator />}
                <Button
                  variant="ghost"
                  className="flex-row justify-between items-center h-auto py-4 px-6 rounded-none"
                  onPress={item.onPress}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      className="text-foreground"
                    />
                    <Text className="text-base">{item.label}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    className="text-foreground"
                  />
                </Button>
              </React.Fragment>
            ))}
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
