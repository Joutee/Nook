import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useFlatContext } from "../contexts/FlatContext";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TopBar = () => {
  const router = useRouter();
  const { currentFlat, flats, setCurrentFlat } = useFlatContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleFlatPress = () => {
    if (flats.length > 1) {
      setIsModalVisible(true);
    }
  };

  const handleSelectFlat = (flat: { id: string; name: string; address: string }) => {
    setCurrentFlat(flat);
    setIsModalVisible(false);
  };

  const handleSettingsPress = () => {
    router.push("/settings");
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* Levá strana - název bytu s možností přepínání */}
        <TouchableOpacity
          style={styles.flatSelector}
          onPress={handleFlatPress}
          disabled={flats.length <= 1}
        >
          <Text style={styles.flatName} numberOfLines={1}>
            {currentFlat?.name || currentFlat?.address|| "Žádný byt"}
          </Text>
          {flats.length > 1 && (
            <Ionicons
              name="chevron-down"
              size={20}
              color="#333"
              style={styles.chevron}
            />
          )}
        </TouchableOpacity>

        {/* Pravá strana - tlačítko nastavení */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
        >
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Modal pro výběr bytu */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vyberte byt</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={flats}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.flatItem,
                    currentFlat?.id === item.id && styles.flatItemActive,
                  ]}
                  onPress={() => handleSelectFlat(item)}
                >
                  <Text
                    style={[
                      styles.flatItemText,
                      currentFlat?.id === item.id && styles.flatItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {currentFlat?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default TopBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  flatSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  flatName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  chevron: {
    marginLeft: 4,
  },
  settingsButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "80%",
    maxHeight: "60%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  flatItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  flatItemActive: {
    backgroundColor: "#f0f0f0",
  },
  flatItemText: {
    fontSize: 16,
    color: "#333",
  },
  flatItemTextActive: {
    fontWeight: "600",
    color: "#007AFF",
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
  },
});
