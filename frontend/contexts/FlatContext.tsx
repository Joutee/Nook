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

interface FlatContextType {
  currentFlat: Flat | null;
  flats: Flat[];
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
        .select("flat_id, flat:flats(id, name)")
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
        } else if (currentFlat) {
          // Zkontroluj, jestli aktuální byt je stále v seznamu
          const stillExists = userFlats.find((f) => f.id === currentFlat.id);
          if (!stillExists) {
            setCurrentFlatState(userFlats[0]);
          }
        }
      } else {
        setFlats([]);
        setCurrentFlatState(null);
      }
    } catch (error) {
      console.error("Error in fetchFlats:", error);
      setFlats([]);
      setCurrentFlatState(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlats();
  }, [session?.user?.id]);

  const setCurrentFlat = (flat: Flat) => {
    setCurrentFlatState(flat);
  };

  const refreshFlats = async () => {
    await fetchFlats();
  };

  return (
    <FlatContext.Provider
      value={{
        currentFlat,
        flats,
        setCurrentFlat,
        isLoading,
        refreshFlats,
      }}
    >
      {children}
    </FlatContext.Provider>
  );
};
