import { View, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import { router } from "expo-router/build/exports";
import { Ionicons } from "@expo/vector-icons";

const flat = () => {
  const menuItems = [
    {
      title: "Dokumenty",
      description: "Spravujte dokumenty vašeho bytu",
      icon: "document-text" as const,
      route: "/documents",
      color: "hsl(217, 91%, 60%)",
    },
    {
      title: "Klíče",
      description: "Informace o klíčích",
      icon: "key" as const,
      route: "/keys",
      color: "hsl(142, 76%, 36%)",
    },
    {
      title: "Závady",
      description: "Nahlaste nebo sledujte závady",
      icon: "warning" as const,
      route: "/issues",
      color: "hsl(25, 95%, 53%)",
    },
  ];

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        <Text className="text-3xl font-bold text-foreground mb-2 text-center">
          Rozcestník
        </Text>
        <Text className="text-sm text-muted-foreground mb-6 text-center">
          Vyberte sekci, kterou chcete spravovat
        </Text>

        <View className="gap-3">
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => router.push(item.route as any)}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <View className="flex-row items-center p-4">
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center mr-4"
                      style={{ backgroundColor: item.color }}
                    >
                      <Ionicons name={item.icon} size={24} color="#fff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-foreground mb-1">
                        {item.title}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {item.description}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="hsl(240, 5%, 64.9%)"
                    />
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

export default flat;
