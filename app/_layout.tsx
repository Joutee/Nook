import { View } from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import TopBar from "@/components/shared/TopBar";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { FlatProvider, useFlatContext } from "@/contexts/FlatContext";
import { ToastProvider } from "@/contexts/ToastContext";
import "@/global.css";
import "@/lib/icons";
import { useColorScheme } from "nativewind";
import { THEME } from "@/lib/theme";

import { PortalHost } from "@rn-primitives/portal";
import logger from "@/lib/logger";

// Inner component with access to FlatContext.
const LayoutContent: React.FC<{ session: Session | null }> = ({ session }) => {
  const { isLoading, hasFlat, hasRole } = useFlatContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    logger.log("=== LAYOUT USEEFFECT ===", {
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

    // Reset password has special handling and can be accessed without login.
    if (
      segmentsArray[0] === "(auth)" &&
      segmentsArray[1] === "reset-password"
    ) {
      return;
    }

    // Not signed in -> login.
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/");
      logger.log("redirect to login");
      return;
    }

    logger.log("isLoading in layout:", isLoading);
    if (isLoading) return;

    // Signed in without a flat -> join-flat.
    if (session && !hasFlat && !inSetupGroup) {
      logger.log("redirect to join-flat");
      router.replace("/(setup)/join-flat");
      return;
    }

    // Signed in with a flat but no role -> select-role.
    if (session && hasFlat && !hasRole && segmentsArray[1] !== "select-role") {
      router.replace("/(setup)/select-role");
      return;
    }

    // Signed in with both flat and role -> leave auth/setup.
    if (session && hasFlat && hasRole && (inAuthGroup || inSetupGroup)) {
      logger.log("redirect to home");
      setTimeout(() => router.replace("/(tabs)/home"), 0);
      return;
    }
  }, [session, segments, isLoading, hasFlat, hasRole]);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const currentTheme = THEME[isDark ? "dark" : "light"];

  // Show TopBar only in tabs.
  const showTopBar = segments[0] === "(tabs)";

  if (session && isLoading) {
    return null;
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
          name="settings/reorder-widgets"
          options={{
            title: "Uspořádat widgety",
          }}
        />
        <Stack.Screen name="expenses/create" options={{ title: "Nový výdaj" }} />
        <Stack.Screen
          name="expenses/[id]/edit"
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
          name="settings/change-email"
          options={{
            title: "Změna e-mailu",
            headerShown: true,
          }}
        />
        <Stack.Screen name="chores/[id]" options={{ title: "Detail úkolu" }} />
        <Stack.Screen name="chores/create" options={{ title: "Nový úkol" }} />
        <Stack.Screen
          name="chores/[id]/history"
          options={{ title: "Historie úkolu" }}
        />
        <Stack.Screen name="chores/[id]/edit" options={{ title: "Upravit úkol" }} />
        <Stack.Screen
          name="issues/create"
          options={{ title: "Nahlásit závadu" }}
        />
        <Stack.Screen
          name="issues/[id]"
          options={{ title: "Detail závady" }}
        />
        <Stack.Screen name="issues/[id]/edit" options={{ title: "Upravit závadu" }} />
        <Stack.Screen
          name="documents/add"
          options={{ title: "Nový dokument" }}
        />
        <Stack.Screen
          name="flats/join"
          options={{
            title: "Připojit se k dalšímu bytu",
            headerShown: true,
            headerBackTitle: "Zpět",
          }}
        />
        <Stack.Screen
          name="flats/create"
          options={{
            title: "Vytvořit novou domácnost",
            headerShown: true,
            headerBackTitle: "Zpět",
          }}
        />
        <Stack.Screen name="keys/create" options={{ title: "Přidat klíč" }} />
        <Stack.Screen name="keys/[id]/edit" options={{ title: "Upravit klíč" }} />
        <Stack.Screen
          name="expenses/recurring"
          options={{ title: "Opakující se výdaje", headerShown: true }}
        />
        <Stack.Screen
          name="expenses/recurring/[id]"
          options={{ title: "Opakující se výdaj", headerShown: true }}
        />
        <Stack.Screen name="profile" options={{ title: "Profil" }} />
        <Stack.Screen name="chat" options={{ title: "Chat" }} />
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
    // Verify session validity on the server.
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session) {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();
          if (error || !user) {
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
        logger.log("Error getting session:", error.message);
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
    return null;
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
