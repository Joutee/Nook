import { View, ActivityIndicator } from "react-native";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFlatContext } from "@/contexts/FlatContext";
import { FlatsList } from "@/components/flats/FlatsList";

export const FlatsWidget = () => {
  const { isLoading } = useFlatContext();

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <CardTitle>Moje byty</CardTitle>
            <Ionicons
              name="home-outline"
              size={24}
              className="text-foreground"
            />
          </View>
        </CardHeader>
        <CardContent>
          <View className="py-4">
            <ActivityIndicator size="small" className="text-primary" />
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-center gap-2">
        <Ionicons name="home-outline" size={24} className="text-foreground" />
        <CardTitle>Moje byty</CardTitle>
      </CardHeader>
      <CardContent>
        <FlatsList />
      </CardContent>
    </Card>
  );
};
