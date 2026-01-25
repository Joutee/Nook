import { StyleSheet, View } from "react-native";
import React from "react";
import { Stack } from "expo-router";
import NavBar from "../components/NavBar";

const RootLayout = () => {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          contentStyle: { flex: 1 },
        }}
      >
        <Stack.Screen name="home" options={{ title: "Home" }} />
        <Stack.Screen name="finance" options={{ title: "Finance" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="flat" options={{ title: "Flat" }} />
        <Stack.Screen
          name="chores"
          options={{ title: "Chores", headerShown: false }}
        />
      </Stack>
      <NavBar />
    </View>
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
