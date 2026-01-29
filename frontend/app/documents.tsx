import { View, Text, StyleSheet } from "react-native";
import React from "react";

const Documents = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dokumenty</Text>
        <Text style={styles.subtitle}>Správa dokumentů k pronájmu</Text>
      </View>
    </View>
  );
};

export default Documents;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
});
