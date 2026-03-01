import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFlatContext } from "../../contexts/FlatContext";

export const FlatsWidget = () => {
  const { flats, currentFlat, setCurrentFlat, isLoading } = useFlatContext();

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <View className="flex-row items-center justify-between">
            <CardTitle>Moje byty</CardTitle>
            <Ionicons name="home-outline" size={24} color="#f59e0b" />
          </View>
        </CardHeader>
        <CardContent>
          <View className="py-4">
            <ActivityIndicator size="small" />
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <CardTitle>Moje byty</CardTitle>
          <Ionicons name="home-outline" size={24} color="#f59e0b" />
        </View>
      </CardHeader>
      <CardContent>
        {flats.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            Nejste členem žádného bytu
          </Text>
        ) : (
          <View>
            {flats.map((flat) => (
              <Pressable
                key={flat.id}
                onPress={() => setCurrentFlat(flat)}
                className="py-2 border-b border-border last:border-b-0"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-semibold ${
                        currentFlat?.id === flat.id
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {flat.name}
                    </Text>
                    {flat.address && (
                      <Text
                        className="text-xs text-muted-foreground mt-0.5"
                        numberOfLines={1}
                      >
                        {flat.address}
                      </Text>
                    )}
                  </View>
                  {currentFlat?.id === flat.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#8b5cf6"
                    />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
};
