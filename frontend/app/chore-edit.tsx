import { ActivityIndicator, View, StyleSheet } from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../utils/supabase";
import { useToast } from "../contexts/ToastContext";
import { ChoreForm, Member } from "../components/CreateChore/ChoreForm";

const EditChore = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<{
    name: string;
    description: string;
    intervalDays: string;
    startDate: string;
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
        .select("*")
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
        console.error("Error loading assignments:", assignmentsError);
      }

      const assignedMembers = assignmentsData
        ? assignmentsData
            .map((item: any) => item.profiles)
            .filter((p: any) => p)
        : [];

      setInitialData({
        name: choreData.name,
        description: choreData.description || "",
        intervalDays: choreData.interval_days.toString(),
        startDate: choreData.start_date || "",
        selectedMembers: assignedMembers,
      });
    } catch (error) {
      console.error("Error:", error);
      showToast("Nepodařilo se načíst úkol", "error");
      router.back();
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <ChoreForm key={id} mode="edit" choreId={id} initialData={initialData} />
  );
};

export default EditChore;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});
