import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../utils/supabase";
import { Session } from "@supabase/supabase-js";

interface Flat {
  id: string;
  name: string;
}

type UserRole = 'pronajimatel' | 'najemce' | null;

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
  return context;
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
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Načíst všechny byty, ke kterým má uživatel přístup
      const { data: flatProfiles, error } = await supabase
        .from("flat_profile")
        .select("flat_id, role, flat:flats(id, name)")
        .eq("profile_id", session.user.id);

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
            name: (fp.flat as any).name || "Bez názvu",
          }));

        setFlats(userFlats);

        // Pokud není nastaven žádný byt, nastav první
        if (!currentFlat && userFlats.length > 0) {
          setCurrentFlatState(userFlats[0]);
          setUserRole(flatProfiles[0].role as UserRole);
        } else if (currentFlat) {
          // Zkontroluj, jestli aktuální byt je stále v seznamu
          const stillExists = userFlats.find((f) => f.id === currentFlat.id);
          if (!stillExists) {
            setCurrentFlatState(userFlats[0]);
            setUserRole(flatProfiles[0].role as UserRole);
          } else {
            // Aktualizuj roli pro současný byt
            const currentProfile = flatProfiles.find((fp) => (fp.flat as any).id === currentFlat.id);
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
    // Načíst roli pro nově vybraný byt
    if (session?.user?.id) {
      const { data } = await supabase
        .from("flat_profile")
        .select("role")
        .eq("profile_id", session.user.id)
        .eq("flat_id", flat.id)
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
