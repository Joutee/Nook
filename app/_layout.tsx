import { View } from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import TopBar from "../components/TopBar";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { FlatProvider, useFlatContext } from "../contexts/FlatContext";
import { ToastProvider } from "../contexts/ToastContext";
import "../global.css";
import "../lib/icons";
import { useColorScheme } from "nativewind";
import { THEME } from "../lib/theme";

import { PortalHost } from "@rn-primitives/portal";

// Vnitřní komponenta s přístupem k FlatContext
const LayoutContent: React.FC<{ session: Session | null }> = ({ session }) => {
  const { isLoading, hasFlat, hasRole } = useFlatContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log("=== LAYOUT USEEFFECT ===", {
      segment: segments[0],
      hasSession: !!session,
      isLoading,
      hasFlat,
      hasRole,
    });

    const segmentsArray = segments as string[];
    const inAuthGroup = segmentsArray[0] === "(auth)";
    const inSetupGroup = segmentsArray[0] === "(setup)";
    const inTabsGroup = segmentsArray[0] === "(tabs)";

    // Reset password má speciální handling - může být přístupná bez přihlášení
    if (
      segmentsArray[0] === "(auth)" &&
      segmentsArray[1] === "reset-password"
    ) {
      return;
    }

    // Není přihlášený -> redirect na login
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/");
      console.log("redirect to login");
      return;
    }

    console.log("isLoading in layout:", isLoading);
    if (isLoading) return;

    // Přihlášený ale nemá byt -> redirect na join-flat
    if (session && !hasFlat && !inSetupGroup) {
      console.log("redirect to join-flat");
      router.replace("/(setup)/join-flat");
      return;
    }

    // Přihlášený, má byt, ale nemá roli -> redirect na select-role
    if (session && hasFlat && !hasRole && segmentsArray[1] !== "select-role") {
      router.replace("/(setup)/select-role");
      return;
    }

    // Přihlášený, má byt i roli -> přesměrovat z auth/setup na hlavní stránku
    if (session && hasFlat && hasRole && (inAuthGroup || inSetupGroup)) {
      console.log("redirect to home");
      setTimeout(() => router.replace("/(tabs)"), 0);
      return;
    }
  }, [session, segments, isLoading, hasFlat, hasRole]);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const currentTheme = THEME[isDark ? "dark" : "light"];

  // Zobrazit TopBar pouze v tabs
  const showTopBar = segments[0] === "(tabs)";

  if (session && isLoading) {
    return null; // Nebo loading screen
  }

  return (
    <View className="flex-1 bg-background" pointerEvents="box-none">
      <StatusBar style={isDark ? "light" : "dark"} />
      {showTopBar && <TopBar />}
      <Stack
        screenOptions={{
          contentStyle: { flex: 1, backgroundColor: "transparent" },
          headerStyle: {
            backgroundColor: currentTheme.card,
          },
          headerTintColor: currentTheme.foreground,
          headerTitleStyle: {
            fontWeight: "bold",
            color: currentTheme.foreground,
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(setup)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="reorder-widgets"
          options={{
            title: "Uspořádat widgety",
          }}
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
          }}
        />
        <Stack.Screen
          name="change-email"
          options={{
            title: "Změna e-mailu",
            headerShown: true,
          }}
        />
        <Stack.Screen name="chore-detail" options={{ title: "Detail úkolu" }} />
        <Stack.Screen name="chore-create" options={{ title: "Nový úkol" }} />
        <Stack.Screen
          name="chore-history"
          options={{ title: "Historie úkolu" }}
        />
        <Stack.Screen name="chore-edit" options={{ title: "Upravit úkol" }} />
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
        <Stack.Screen name="key-create" options={{ title: "Přidat klíč" }} />
        <Stack.Screen name="key-edit" options={{ title: "Upravit klíč" }} />
        <Stack.Screen name="profile" options={{ title: "Profil" }} />
        <Stack.Screen
          name="change-password"
          options={{ title: "Změna hesla" }}
        />
      </Stack>
    </View>
  );
};

const RootLayout = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Ověřit platnost session na serveru
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
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
      })
      .catch(async (error) => {
        // Zachytit chyby s neplatným refresh tokenem
        console.log("Error getting session:", error.message);
        // Vyčistit neplatnou session
        await supabase.auth.signOut();
        setSession(null);
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
