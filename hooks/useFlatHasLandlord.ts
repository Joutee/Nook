import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useFlatContext } from "@/contexts/FlatContext";
import logger from "@/lib/logger";

export const useFlatHasLandlord = () => {
  const { currentFlat } = useFlatContext();
  const [hasLandlord, setHasLandlord] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const check = async () => {
        if (!currentFlat?.id) {
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          const { data, error } = await supabase
            .from("flat_profile")
            .select("id")
            .eq("flat_id", currentFlat.id)
            .eq("role", "pronajimatel")
            .eq("active", true)
            .limit(1);

          if (error) {
            logger.error("Error checking landlord:", error);
            setHasLandlord(true); // fail open — don't block on error
            return;
          }

          setHasLandlord((data?.length ?? 0) > 0);
        } finally {
          setIsLoading(false);
        }
      };

      check();
    }, [currentFlat?.id]),
  );

  return { hasLandlord, isLoading };
};
