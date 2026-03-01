import { ScrollView, View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import React, { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useFlatContext } from "../contexts/FlatContext";
import { FinanceWidget } from "@/components/dashboard_widgets/FinanceWidget";
import { IssuesWidget } from "@/components/dashboard_widgets/IssuesWidget";
import { ChoresWidget } from "@/components/dashboard_widgets/MyChoresWidget";
import { FlatsWidget } from "@/components/dashboard_widgets/FlatsWidget";
import { FlatMembersWidget } from "@/components/dashboard_widgets/FlatMembersWidget";
import { DocumentsWidget } from "@/components/dashboard_widgets/DocumentsWidget";
import { Profile } from "../types/profile";
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_WIDGETS } from "../config/widgetConfig";

// Modulová proměnná pro sledování, zda už proběhl Supabase sync v této session
let hasSupabaseSyncedInSession = false;

// Mapování klíčů na komponenty
const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  finance_widget: FinanceWidget,
  issues_widget: IssuesWidget,
  chores_widget: ChoresWidget,
  flats_widget: FlatsWidget,
  flat_members_widget: FlatMembersWidget,
  documents_widget: DocumentsWidget,
};

export default function Home() {
  const [widgetKeys, setWidgetKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const { currentFlat } = useFlatContext();

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
      // 1. Okamžitě načíst z AsyncStorage
      const storedLayout = await AsyncStorage.getItem(DASHBOARD_LAYOUT_KEY);
      if (storedLayout) {
        const parsed = JSON.parse(storedLayout);
        setWidgetKeys(parsed);
        setIsLoading(false);
      }

      // 2. Pokud ještě neproběhl sync v této session, fetchni ze Supabase
      if (!hasSupabaseSyncedInSession) {
        // Získat aktuálního uživatele
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
            // Při chybě použij výchozí layout
            const layoutToUse = storedLayout
              ? JSON.parse(storedLayout)
              : DEFAULT_WIDGETS;
            setWidgetKeys(layoutToUse);
            await AsyncStorage.setItem(
              DASHBOARD_LAYOUT_KEY,
              JSON.stringify(layoutToUse),
            );
          } else {
            // Data ze Supabase přišla
            const dbLayout = data?.dashboard_layout || DEFAULT_WIDGETS;
            setWidgetKeys(dbLayout);
            // Synchronizovat s AsyncStorage
            await AsyncStorage.setItem(
              DASHBOARD_LAYOUT_KEY,
              JSON.stringify(dbLayout),
            );
          }
        } else {
          // Pokud není user, použij výchozí layout
          const layoutToUse = storedLayout
            ? JSON.parse(storedLayout)
            : DEFAULT_WIDGETS;
          setWidgetKeys(layoutToUse);
        }

        // Nastavit flag, že sync proběhl
        hasSupabaseSyncedInSession = true;
      }
    } catch (error) {
      console.error("Error in loadDashboardLayout:", error);
      // Použít výchozí layout při chybě
      setWidgetKeys(DEFAULT_WIDGETS);
    } finally {
      setIsLoading(false);
    }
  };
  if (!currentFlat) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-muted-foreground">
          Nejprve se připojte k bytu
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
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
        {widgetKeys.map((key) => {
          const WidgetComponent = WIDGET_COMPONENTS[key];
          if (!WidgetComponent) {
            console.warn(`Widget with key "${key}" not found`);
            return null;
          }
          return <WidgetComponent key={key} />;
        })}

        {/* Tlačítko pro uspořádání widgetů */}
        <View className="mt-4 items-center">
          <Button
            variant="secondary"
            onPress={() => router.push("/reorder-widgets")}
            className="w-2/3"
          >
            <Ionicons name="options-outline" size={20} color="#3b82f6" />
            <Text>Uspořádat</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
