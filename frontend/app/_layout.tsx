import { StyleSheet, View, TouchableOpacity, Text, Alert } from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import NavBar from "../components/NavBar";
import { supabase } from "../utils/supabase";
import { Session } from "@supabase/supabase-js";

const RootLayout = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFlat, setHasFlat] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Ověřit platnost session na serveru
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Zkontrolovat, jestli je session platný
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error || !user) {
          // Session není platný - smazat a odhlásit
          await supabase.auth.signOut();
          setSession(null);
          setIsLoading(false);
        } else {
          setSession(session);
          checkFlatAssociation(user.id);
        }
      } else {
        setSession(null);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkFlatAssociation(session.user.id);
      } else {
        setHasFlat(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkFlatAssociation = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("flat_profile")
        .select("id")
        .eq("profile_id", userId)
        .single();

      setHasFlat(!!data && !error);
    } catch (error) {
      setHasFlat(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "login" || segments[0] === "register";
    const onJoinFlatPage = segments[0] === "join-flat";
    const onCreateFlatPage = segments[0] === "create-flat";

    if (!session && !inAuthGroup) {
      // Není přihlášený a není na auth stránce -> redirect na login
      router.replace("/login");
    } else if (session && inAuthGroup) {
      // Je přihlášený a je na auth stránce -> zkontrolovat byt
      if (hasFlat === false) {
        router.replace("/join-flat");
      } else if (hasFlat === true) {
        router.replace("/");
      }
    } else if (
      session &&
      hasFlat === false &&
      !onJoinFlatPage &&
      !onCreateFlatPage
    ) {
      // Je přihlášený, nemá byt a není na join-flat ani create-flat stránce
      router.replace("/join-flat");
    } else if (
      session &&
      hasFlat === true &&
      (onJoinFlatPage || onCreateFlatPage)
    ) {
      // Je přihlášený, má byt a je na join-flat nebo create-flat stránce -> redirect home
      router.replace("/");
    }
  }, [session, segments, isLoading, hasFlat]);

  // Skrýt navbar na přihlašovacích stránkách a join-flat
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/join-flat" ||
    pathname === "/create-flat";

  const handleLogout = async () => {
    Alert.alert("Odhlášení", "Opravdu se chcete odhlásit?", [
      {
        text: "Zrušit",
        style: "cancel",
      },
      {
        text: "Odhlásit",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert("Chyba", "Nepodařilo se odhlásit");
          } else {
            router.replace("/login");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return null; // Nebo loading screen
  }

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          contentStyle: { flex: 1 },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Domů",
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="join-flat"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="create-flat"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="finance" options={{ title: "Finance" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="flat" options={{ title: "Flat" }} />
        <Stack.Screen name="chores" options={{ title: "Chores" }} />
      </Stack>
      {!isAuthPage && (
        <>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Odhlásit se</Text>
          </TouchableOpacity>
          <NavBar />
        </>
      )}
    </View>
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoutButton: {
    backgroundColor: "#ff3b30",
    padding: 15,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
