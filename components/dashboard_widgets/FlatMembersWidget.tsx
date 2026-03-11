import { View } from "react-native";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MemberList } from "@/components/MemberList";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

export const FlatMembersWidget = () => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <CardTitle>Členové bytu</CardTitle>
          <Ionicons name="people-outline" size={24} color="#6366f1" />
        </View>
      </CardHeader>
      <CardContent>
        <MemberList showActions={true} />
      </CardContent>
    </Card>
  );
};
