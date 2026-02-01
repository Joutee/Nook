import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { router } from "expo-router/build/exports";

const flat = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rozcestník</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/documents")}
      >
        <Text style={styles.buttonText}>Dokumenty</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/keys")}
      >
        <Text style={styles.buttonText}>Klíč</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/")}>
        <Text style={styles.buttonText}>Nahlásit závadu</Text>
      </TouchableOpacity>
    </View>
  );
};

export default flat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
