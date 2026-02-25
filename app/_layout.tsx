import { StyleSheet, View, TouchableOpacity, Alert } from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import NavBar from "../components/NavBar";
import TopBar from "../components/TopBar";
import { supabase } from "../utils/supabase";
import { Session } from "@supabase/supabase-js";
import { FlatProvider, useFlatContext } from "../contexts/FlatContext";
import { ToastProvider } from "../contexts/ToastContext";
import "../global.css";
import "../lib/icons";
import { useColorScheme } from "nativewind";
import { THEME } from "../lib/theme"; //

import { PortalHost } from "@rn-primitives/portal";

// Vnitřní komponenta s přístupem k FlatContext
const LayoutContent: React.FC<{ session: Session | null }> = ({ session }) => {
  const { isLoading, hasFlat, hasRole } = useFlatContext();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  //useEffect(() => {console.log(isLoading)}, [isLoading]);

  useEffect(() => {
    const onSignInPage = segments[0] === "login" || segments[0] === "register";

    // Není přihlášený -> redirect na login
    if (!session && !onSignInPage) {
      router.replace("/login");
      console.log("redirect to login");
      return;
    }

    console.log("isLoading in layout:", isLoading);
    if (isLoading) return;

    const onJoinFlatPage =
      segments[0] === "join-flat" || segments[0] === "create-flat";
    const onSelectRolePage = segments[0] === "select-role";

    if (session && !hasFlat && !onJoinFlatPage) {
      console.log("redirect to join-flat");
      router.replace("/join-flat");
      return;
    }

    if (session && hasFlat && !hasRole && !onSelectRolePage) {
      router.replace("/select-role");
      return;
    }

    if (
      session &&
      hasFlat &&
      hasRole &&
      (onJoinFlatPage || onSelectRolePage || onSignInPage)
    ) {
      console.log("redirect to home");
      router.replace("/");
      return;
    }
  }, [session, segments, isLoading, hasFlat, hasRole]);

  const showNavigationPaths = [
    "/",
    "/chores",
    "/finance",
    "/issues",
    "/keys",
    "/documents",
    "/more",
  ];
  const showNavigation = showNavigationPaths.includes(pathname);
  console.log("showNavigation:", showNavigation);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  // Vybere správnou sadu barev z tvého souboru theme.ts
  const currentTheme = THEME[isDark ? "dark" : "light"];

  if (session && isLoading) {
    return null; // Nebo loading screen
  }

  return (
    <View className="flex-1 bg-background">
      {showNavigation && <TopBar />}
      <Stack
        screenOptions={{
          contentStyle: { flex: 1, backgroundColor: "transparent" },

          // --- NASTAVENÍ HEADERU ---
          headerStyle: {
            // Použije barvu 'background' z tvého theme.ts
            backgroundColor: currentTheme.card,
          },
          headerTintColor: currentTheme.foreground, // Barva šipky "Zpět" a názvu
          headerTitleStyle: {
            fontWeight: "bold",
            color: currentTheme.foreground, // Barva textu titulku
          },
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
          name="select-role"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="finance"
          options={{ title: "Finance", headerShown: false }}
        />
        <Stack.Screen name="expense-create" options={{ title: "Nový výdaj" }} />
        <Stack.Screen
          name="expense-edit"
          options={{ title: "Upravit výdaj" }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: "Nastavení",
            headerShown: true,
            headerBackTitle: "Zpět",
          }}
        />
        <Stack.Screen
          name="more"
          options={{ title: "Další", headerShown: false }}
        />
        <Stack.Screen
          name="chores"
          options={{ title: "Úkoly", headerShown: false }}
        />
        <Stack.Screen name="chore-detail" options={{ title: "Detail úkolu" }} />
        <Stack.Screen name="chore-create" options={{ title: "Nový úkol" }} />
        <Stack.Screen
          name="chore-history"
          options={{ title: "Historie úkolu" }}
        />
        <Stack.Screen name="chore-edit" options={{ title: "Upravit úkol" }} />
        <Stack.Screen
          name="issues"
          options={{ title: "Závady", headerShown: false }}
        />
        <Stack.Screen
          name="issue-create"
          options={{ title: "Nahlásit závadu" }}
        />
        <Stack.Screen
          name="issue-detail"
          options={{ title: "Detail závady" }}
        />
        <Stack.Screen name="issue-edit" options={{ title: "Upravit závadu" }} />
        <Stack.Screen
          name="keys"
          options={{ title: "Klíče", headerShown: false }}
        />
        <Stack.Screen
          name="documents"
          options={{ title: "Dokumenty", headerShown: false }}
        />
        <Stack.Screen
          name="document-add"
          options={{ title: "Nový dokument" }}
        />
        <Stack.Screen
          name="join-another-flat"
          options={{
            title: "Připojit se k dalšímu bytu",
            headerShown: true,
            headerBackTitle: "Zpět",
          }}
        />
        <Stack.Screen
          name="create-another-flat"
          options={{
            title: "Vytvořit novou domácnost",
            headerShown: true,
            headerBackTitle: "Zpět",
          }}
        />
      </Stack>
      {showNavigation && (
        <>
          <NavBar />
        </>
      )}
    </View>
  );
};

const RootLayout = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

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
        } else {
          setSession(session);
        }
      } else {
        setSession(null);
      }
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (initializing) {
    return null; // Nebo loading screen
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <FlatProvider session={session}>
          <LayoutContent session={session} />
          <PortalHost />
        </FlatProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;
