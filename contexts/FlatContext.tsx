import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Flat } from "../types/flat";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CURRENT_FLAT_KEY = "@current_flat_id";

type UserRole = "pronajimatel" | "najemce" | null;

interface FlatContextType {
  currentFlat: Flat | null;
  flats: Flat[];
  userRole: UserRole;
  setCurrentFlat: (flat: Flat) => void;
  isLoading: boolean;
  refreshFlats: () => Promise<void>;
}

const FlatContext = createContext<FlatContextType | undefined>(undefined);

export const useFlatContext = () => {
  const context = useContext(FlatContext);
  if (!context) {
    throw new Error("useFlatContext must be used within FlatProvider");
  }

  // Computed values
  const hasFlat = context.flats.length > 0;
  const hasRole = hasFlat && context.userRole !== null;

  return {
    ...context,
    hasFlat,
    hasRole,
  };
};

interface FlatProviderProps {
  children: ReactNode;
  session: Session | null;
}

export const FlatProvider: React.FC<FlatProviderProps> = ({
  children,
  session,
}) => {
  const [currentFlat, setCurrentFlatState] = useState<Flat | null>(null);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlats = async () => {
    if (!session?.user?.id) {
      setFlats([]);
      setCurrentFlatState(null);
      setIsLoading(true);
      return;
    }

    try {
      setIsLoading(true);
      console.log("started Fetching flats");
      // Načíst všechny byty, ke kterým má uživatel přístup
      const { data: flatProfiles, error } = await supabase
        .from("flat_profile")
        .select("flat_id, role, flat:flats(id, name, address)")
        .eq("profile_id", session.user.id)
        .eq("active", true);
      console.log("ended Fetching flats");
      if (error) {
        console.error("Error fetching flats:", error);
        setFlats([]);
        setCurrentFlatState(null);
        return;
      }

      if (flatProfiles && flatProfiles.length > 0) {
        const userFlats: Flat[] = flatProfiles
          .filter((fp) => fp.flat)
          .map((fp) => ({
            id: (fp.flat as any).id,
            name:
              (fp.flat as any).name || (fp.flat as any).address || "Bez názvu",
            address: (fp.flat as any).address || "",
          }));

        setFlats(userFlats);

        // Pokud není nastaven žádný byt, nastav první nebo načti z AsyncStorage
        if (!currentFlat && userFlats.length > 0) {
          try {
            const savedFlatId = await AsyncStorage.getItem(CURRENT_FLAT_KEY);
            const savedFlat = savedFlatId
              ? userFlats.find((f) => f.id === savedFlatId)
              : null;

            if (savedFlat) {
              // Použij uložený byt
              const savedProfile = flatProfiles.find(
                (fp) => (fp.flat as any).id === savedFlatId,
              );
              setCurrentFlatState(savedFlat);
              setUserRole((savedProfile?.role as UserRole) || null);
            } else {
              // Nastav první byt v seznamu
              setCurrentFlatState(userFlats[0]);
              setUserRole(flatProfiles[0].role as UserRole);
              await AsyncStorage.setItem(CURRENT_FLAT_KEY, userFlats[0].id);
            }
          } catch (error) {
            console.error("Chyba při načítání uloženého bytu:", error);
            setCurrentFlatState(userFlats[0]);
            setUserRole(flatProfiles[0].role as UserRole);
          }
        } else if (currentFlat) {
          // Zkontroluj, jestli aktuální byt je stále v seznamu
          const stillExists = userFlats.find((f) => f.id === currentFlat.id);
          if (!stillExists) {
            setCurrentFlatState(userFlats[0]);
            setUserRole(flatProfiles[0].role as UserRole);
            await AsyncStorage.setItem(CURRENT_FLAT_KEY, userFlats[0].id);
          } else {
            // Aktualizuj roli pro současný byt
            const currentProfile = flatProfiles.find(
              (fp) => (fp.flat as any).id === currentFlat.id,
            );
            setUserRole(currentProfile?.role as UserRole);
          }
        }
      } else {
        setFlats([]);
        setCurrentFlatState(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error("Error in fetchFlats:", error);
      setFlats([]);
      setCurrentFlatState(null);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, [session?.user?.id]);

  const setCurrentFlat = async (flat: Flat) => {
    setCurrentFlatState(flat);

    // Uložit vybraný byt do AsyncStorage
    try {
      await AsyncStorage.setItem(CURRENT_FLAT_KEY, flat.id);
    } catch (error) {
      console.error("Chyba při ukládání bytu:", error);
    }

    // Načíst roli pro nově vybraný byt
    if (session?.user?.id) {
      const { data } = await supabase
        .from("flat_profile")
        .select("role")
        .eq("profile_id", session.user.id)
        .eq("flat_id", flat.id)
        .eq("active", true)
        .single();

      if (data) {
        setUserRole(data.role as UserRole);
      }
    }
  };

  const refreshFlats = async () => {
    await fetchFlats();
  };

  return (
    <FlatContext.Provider
      value={{
        currentFlat,
        flats,
        userRole,
        setCurrentFlat,
        isLoading,
        refreshFlats,
      }}
    >
      {children}
    </FlatContext.Provider>
  );
};
