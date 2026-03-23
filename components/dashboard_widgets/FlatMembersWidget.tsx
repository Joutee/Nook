import { View } from "react-native";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MemberList } from "@/components/flats/MemberList";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

export const FlatMembersWidget = () => {
  return (
    <Card className="mb-4">
          <CardHeader className="flex-row items-center gap-2">
            <Ionicons
              name="people-outline"
              size={24}
              className="text-foreground"
            />
            <CardTitle>Členové bytu</CardTitle>
      </CardHeader>
      <CardContent>
        <MemberList showActions={true} />
      </CardContent>
    </Card>
  );
};
