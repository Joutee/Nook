import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DEFAULT_WIDGETS,
  ALL_WIDGETS,
  getWidgetsByRole,
  getDefaultWidgetsByRole,
} from "@/config/widgetConfig";
import { WidgetReorderItem } from "@/components/shared/WidgetReorderItem";
import logger from "@/lib/logger";

export default function ReorderWidgets() {
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { currentFlat, userRole } = useFlatContext();
  const { showToast } = useToast();

  // Získat widgety dostupné pro aktuální roli
  const allowedWidgets = getWidgetsByRole(userRole);

  useEffect(() => {
    loadCurrentLayout();
  }, [userRole]); // Reload when role changes

  const loadCurrentLayout = async () => {
    if (!currentFlat?.id) {
      setIsLoading(false);
      return;
    }

    const DASHBOARD_LAYOUT_KEY = `@dashboard_layout_${currentFlat.id}`;

    setIsLoading(true);
    try {
      // Načíst z AsyncStorage
      const storedLayout = await AsyncStorage.getItem(DASHBOARD_LAYOUT_KEY);
      let active: string[];

      if (storedLayout) {
        active = JSON.parse(storedLayout);
      } else {
        active = getDefaultWidgetsByRole(userRole);
      }

      // Filtrovat podle role - zobrazit jen widgety dostupné pro aktuální roli
      const filteredActive = active.filter((w) => allowedWidgets.includes(w));

      // Rozdělit na aktivní a skryté (pouze z povolených widgetů)
      setActiveWidgets(filteredActive);
      const hidden = allowedWidgets.filter((w) => !filteredActive.includes(w));
      setHiddenWidgets(hidden);
    } catch (error) {
      logger.error("Error loading layout:", error);
      const defaultFiltered = getDefaultWidgetsByRole(userRole).filter((w) =>
        allowedWidgets.includes(w),
      );
      setActiveWidgets(defaultFiltered);
      setHiddenWidgets([]);
      showToast("Nepodařilo se načíst rozložení", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const saveLayout = async () => {
    if (!currentFlat?.id) {
      showToast("Není vybrán žádný byt", "error");
      return;
    }

    const DASHBOARD_LAYOUT_KEY = `@dashboard_layout_${currentFlat.id}`;

    setIsSaving(true);
    try {
      // 1. Získat aktuálního uživatele a uložit do Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase
          .from("flat_profile")
          .update({ dashboard_layout: activeWidgets })
          .eq("flat_id", currentFlat.id)
          .eq("profile_id", user.id);

        if (error) {
          throw error;
        }
      }

      // 2. Po úspěšném uložení do Supabase aktualizovat AsyncStorage
      await AsyncStorage.setItem(
        DASHBOARD_LAYOUT_KEY,
        JSON.stringify(activeWidgets),
      );

      showToast("Rozložení bylo úspěšně uloženo", "success");

      // 3. Vrátit se zpět na dashboard
      router.back();
    } catch (error: any) {
      logger.error("Error saving layout:", error);
      showToast(
        "Nepodařilo se uložit rozložení: " + (error.message || "Neznámá chyba"),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hideWidget = (widgetKey: string) => {
    setActiveWidgets(activeWidgets.filter((w) => w !== widgetKey));
    setHiddenWidgets([...hiddenWidgets, widgetKey]);
  };

  const showWidget = (widgetKey: string) => {
    setHiddenWidgets(hiddenWidgets.filter((w) => w !== widgetKey));
    setActiveWidgets([...activeWidgets, widgetKey]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  // Kombinovaná datová struktura pro jeden DraggableFlatList
  type WidgetItem = {
    key: string;
    type:
      | "header-active"
      | "widget-active"
      | "empty-active"
      | "header-hidden"
      | "widget-hidden"
      | "buttons";
    widgetKey?: string;
  };

  const buildItemsList = (): WidgetItem[] => {
    const items: WidgetItem[] = [];

    // Header pro aktivní
    items.push({ key: "header-active", type: "header-active" });

    // Aktivní widgety
    if (activeWidgets.length === 0) {
      items.push({ key: "empty-active", type: "empty-active" });
    } else {
      activeWidgets.forEach((w) => {
        items.push({ key: `active-${w}`, type: "widget-active", widgetKey: w });
      });
    }

    // Header pro skryté (jen pokud jsou nějaké)
    if (hiddenWidgets.length > 0) {
      items.push({ key: "header-hidden", type: "header-hidden" });

      // Skryté widgety
      hiddenWidgets.forEach((w) => {
        items.push({ key: `hidden-${w}`, type: "widget-hidden", widgetKey: w });
      });
    }

    // Tlačítka
    items.push({ key: "buttons", type: "buttons" });

    return items;
  };

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<WidgetItem>) => {
    if (item.type === "header-active") {
      return (
        <View className="p-4 pb-2">
          <Text className="text-lg font-bold text-foreground mb-1">
            Aktivní widgety
          </Text>
        </View>
      );
    }

    if (item.type === "empty-active") {
      return (
        <View className="px-4 pb-4">
          <Card className="bg-muted/30">
            <CardContent className="py-6">
              <Text className="text-center text-muted-foreground">
                Žádné aktivní widgety. Zobrazte widget kliknutím na ikonu oka
                níže.
              </Text>
            </CardContent>
          </Card>
        </View>
      );
    }

    if (item.type === "widget-active" && item.widgetKey) {
      const widgetKey = item.widgetKey;
      return (
        <WidgetReorderItem
          widgetKey={widgetKey}
          isHidden={false}
          onToggleVisibility={() => hideWidget(widgetKey)}
          drag={drag}
          isActive={isActive}
        />
      );
    }

    if (item.type === "header-hidden") {
      return (
        <View className="p-4 pb-2 pt-6">
          <Text className="text-lg font-bold text-foreground mb-1">
            Skryté widgety
          </Text>
        </View>
      );
    }

    if (item.type === "widget-hidden" && item.widgetKey) {
      const widgetKey = item.widgetKey;
      return (
        <WidgetReorderItem
          widgetKey={widgetKey}
          isHidden={true}
          onToggleVisibility={() => showWidget(widgetKey)}
          drag={drag}
          isActive={isActive}
        />
      );
    }

    if (item.type === "buttons") {
      return (
        <View className="p-4 gap-3 pb-8">
          <Button onPress={saveLayout} disabled={isSaving}>
            {isSaving ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" className="text-primary" />
                <Text>Ukládání...</Text>
              </View>
            ) : (
              <Text>Uložit</Text>
            )}
          </Button>
          <Button variant="secondary" onPress={() => router.back()}>
            <Text>Zrušit</Text>
          </Button>
        </View>
      );
    }

    return null;
  };

  const handleDragEnd = ({ data }: { data: WidgetItem[] }) => {
    // Najít pozici headeru pro skryté widgety
    const hiddenHeaderIndex = data.findIndex(
      (item) => item.type === "header-hidden",
    );

    const newActive: string[] = [];
    const newHidden: string[] = [];

    data.forEach((item, index) => {
      // Pokud je to widget
      if (
        (item.type === "widget-active" || item.type === "widget-hidden") &&
        item.widgetKey
      ) {
        // Pokud je header-hidden v seznamu a widget je za ním, je skrytý
        if (hiddenHeaderIndex !== -1 && index > hiddenHeaderIndex) {
          newHidden.push(item.widgetKey);
        } else if (
          item.type === "widget-active" ||
          item.type === "widget-hidden"
        ) {
          // Jinak je aktivní (nebo pokud header-hidden není v seznamu)
          newActive.push(item.widgetKey);
        }
      }
    });

    setActiveWidgets(newActive);
    setHiddenWidgets(newHidden);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        <DraggableFlatList
          data={buildItemsList()}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          activationDistance={10}
        />
      </View>
    </GestureHandlerRootView>
  );
}
