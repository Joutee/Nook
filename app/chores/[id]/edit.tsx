import { ActivityIndicator, View } from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { ChoreForm } from "@/components/chores/ChoreForm";
import { Member } from "@/types/members";
import { RecurringInterval } from "@/types/finance";
import logger from "@/lib/logger";

const EditChore = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<{
    name: string;
    description: string;
    intervalType: RecurringInterval;
    intervalDay: number;
    intervalMonth: number;
    customDays: number;
    recurringIntervalId?: string;
    selectedMembers: Member[];
  } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      loadChoreData();
    }
  }, [id]);

  const loadChoreData = async () => {
    if (!id) return;

    setIsLoadingData(true);
    try {
      const { data: choreData, error: choreError } = await supabase
        .from("chores")
        .select("*, recurring_interval:recurring_intervals(*)")
        .eq("id", id)
        .single();

      if (choreError) {
        showToast("Nepodařilo se načíst úkol: " + choreError.message, "error");
        router.back();
        return;
      }

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("chore_profile")
        .select(
          "profile_id, rotation_order, profiles(id, name, surname, avatar_url)",
        )
        .eq("chore_id", id)
        .order("rotation_order");

      if (assignmentsError) {
        logger.error("Error loading assignments:", assignmentsError);
      }

      const assignedMembers = assignmentsData
        ? assignmentsData
            .map((item: any) => item.profiles)
            .filter((p: any) => p)
        : [];

      setInitialData({
        name: choreData.name,
        description: choreData.description || "",
        intervalType: choreData.recurring_interval.type,
        intervalDay: choreData.recurring_interval.interval_day ?? 1,
        intervalMonth: choreData.recurring_interval.interval_month ?? 1,
        customDays: choreData.recurring_interval.custom_days ?? 7,
        recurringIntervalId: choreData.recurring_interval_id,
        selectedMembers: assignedMembers,
      });
    } catch (error) {
      logger.error("Error:", error);
      showToast("Nepodařilo se načíst úkol", "error");
      router.back();
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoadingData) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <View className="flex-1 bg-background">
      <ChoreForm key={id} mode="edit" choreId={id} initialData={initialData} />
    </View>
  );
};

export default EditChore;
