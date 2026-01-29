import { StyleSheet, View, TouchableOpacity, Text, Alert } from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import NavBar from "../components/NavBar";
import TopBar from "../components/TopBar";
import { supabase } from "../utils/supabase";
import { Session } from "@supabase/supabase-js";
import { FlatProvider } from "../contexts/FlatContext";

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
        .eq("profile_id", userId);

      // Uživatel má byt, pokud existuje alespoň jeden záznam
      setHasFlat(!error && data && data.length > 0);
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

  // Skrýt navbar a topbar na přihlašovacích stránkách a join-flat
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/join-flat" ||
    pathname === "/create-flat";

  if (isLoading) {
    return null; // Nebo loading screen
  }

  return (
    <SafeAreaProvider>
      <FlatProvider session={session}>
        <View style={styles.container}>
          {!isAuthPage && <TopBar />}
          <Stack
            screenOptions={{
              contentStyle: { flex: 1 },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                title: "Domů",
                headerShown: false,
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
            <Stack.Screen
              name="finance"
              options={{ title: "Finance", headerShown: false }}
            />
            <Stack.Screen
              name="settings"
              options={{ title: "Settings", headerShown: false }}
            />
            <Stack.Screen
              name="flat"
              options={{ title: "Flat", headerShown: false }}
            />
            <Stack.Screen
              name="chores"
              options={{ title: "Chores", headerShown: false }}
            />
            <Stack.Screen
              name="chat"
              options={{ title: "Chat", headerShown: false }}
            />
            <Stack.Screen
              name="keys"
              options={{ title: "Keys", headerShown: false }}
            />
            <Stack.Screen
              name="documents"
              options={{ title: "Documents", headerShown: false }}
            />
          </Stack>
          {!isAuthPage && (
            <>
              <NavBar />
            </>
          )}
        </View>
      </FlatProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
