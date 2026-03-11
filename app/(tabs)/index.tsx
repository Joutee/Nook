import { ScrollView, View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import React, { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { Profile } from "@/types/profile";
import { Ionicons } from "@expo/vector-icons";
import {
  DEFAULT_WIDGETS,
  WIDGET_COMPONENTS,
  getWidgetsByRole,
  getDefaultWidgetsByRole,
} from "@/config/widgetConfig";

// Modulová proměnná pro sledování, pro které byty už proběhl Supabase sync v této session
let syncedFlats = new Set<string>();

export default function Home() {
  const [widgetKeys, setWidgetKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const { currentFlat, userRole } = useFlatContext();

  useFocusEffect(
    useCallback(() => {
      if (currentFlat?.id) {
        loadDashboardLayout();
      }
      loadUserProfile();
    }, [currentFlat]),
  );

  const loadUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setUserName(data.name || "");
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const loadDashboardLayout = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    const DASHBOARD_LAYOUT_KEY = `@dashboard_layout_${currentFlat.id}`;

    try {
      setIsLoading(true);

      // Pokud už byl tento byt načten v této session, použij local storage
      if (syncedFlats.has(currentFlat.id)) {
        const storedLayout = await AsyncStorage.getItem(DASHBOARD_LAYOUT_KEY);
        if (storedLayout) {
          setWidgetKeys(JSON.parse(storedLayout));
          setIsLoading(false);
          return;
        }
        // Pokud z nějakého důvodu není v local storage, pokračuj na načtení z DB
      }

      // První načtení tohoto bytu v session - načíst z databáze
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("flat_profile")
          .select("dashboard_layout")
          .eq("flat_id", currentFlat.id)
          .eq("profile_id", user.id)
          .single();

        if (error) {
          console.error("Error loading dashboard layout:", error);
          // Při chybě použij local storage jako fallback
          const storedLayout = await AsyncStorage.getItem(DASHBOARD_LAYOUT_KEY);
          const layoutToUse = storedLayout
            ? JSON.parse(storedLayout)
            : getDefaultWidgetsByRole(userRole);
          setWidgetKeys(layoutToUse);
        } else {
          // Data ze Supabase přišla - použij je jako primární zdroj
          const dbLayout =
            data?.dashboard_layout || getDefaultWidgetsByRole(userRole);
          setWidgetKeys(dbLayout);
          // Synchronizovat s AsyncStorage
          await AsyncStorage.setItem(
            DASHBOARD_LAYOUT_KEY,
            JSON.stringify(dbLayout),
          );
        }

        // Označit tento byt jako načtený v této session
        syncedFlats.add(currentFlat.id);
      } else {
        // Pokud není user, použij local storage nebo výchozí layout
        const storedLayout = await AsyncStorage.getItem(DASHBOARD_LAYOUT_KEY);
        const layoutToUse = storedLayout
          ? JSON.parse(storedLayout)
          : getDefaultWidgetsByRole(userRole);
        setWidgetKeys(layoutToUse);
      }
    } catch (error) {
      console.error("Error in loadDashboardLayout:", error);
      // Použít local storage nebo výchozí layout při chybě
      try {
        const storedLayout = await AsyncStorage.getItem(DASHBOARD_LAYOUT_KEY);
        const layoutToUse = storedLayout
          ? JSON.parse(storedLayout)
          : getDefaultWidgetsByRole(userRole);
        setWidgetKeys(layoutToUse);
      } catch {
        setWidgetKeys(getDefaultWidgetsByRole(userRole));
      }
    } finally {
      setIsLoading(false);
    }
  };
  if (!currentFlat) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-background">
        <Text className="text-center text-muted-foreground">
          Nejprve se připojte k bytu
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        <Text className="text-3xl font-bold text-foreground mb-4">
          Vítejte, {userName || "uživateli"}!
        </Text>

        {/* Dynamické vykreslení widgetů */}
        {widgetKeys
          .filter((key) => {
            // Filtrovat widgety podle role
            const allowedWidgets = getWidgetsByRole(userRole);
            return allowedWidgets.includes(key);
          })
          .map((key) => {
            const WidgetComponent = WIDGET_COMPONENTS[key];
            if (!WidgetComponent) {
              console.warn(`Widget with key "${key}" not found`);
              return null;
            }
            return <WidgetComponent key={key} />;
          })}

        {/* Tlačítko pro uspořádání widgetů */}
        <View className="items-center">
          <Button
            variant="outline"
            onPress={() => router.push("/reorder-widgets")}
            className="w-2/3"
          >
            <Ionicons
              name="options-outline"
              size={20}
              className="text-foreground"
            />
            <Text>Uspořádat</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
