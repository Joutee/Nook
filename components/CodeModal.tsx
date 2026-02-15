import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useToast } from "../contexts/ToastContext";

interface CodeModalProps {
  visible: boolean;
  code: string;
  onClose: () => void;
}

export default function CodeModal({ visible, code, onClose }: CodeModalProps) {
  const { showToast } = useToast();

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(code);
    showToast("Kód byl zkopírován do schránky", "success");
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={48} color="#28a745" />
          </View>

          <Text style={styles.title}>Byt byl úspěšně vytvořen!</Text>
          <Text style={styles.description}>
            Sdílejte tento kód s ostatními, aby se mohli připojit k bytu.
          </Text>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Kód pro připojení</Text>
            <Text style={styles.code}>{code}</Text>
          </View>

          <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
            <Ionicons name="copy-outline" size={20} color="#007AFF" />
            <Text style={styles.copyButtonText}>Zkopírovat kód</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Zavřít</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#333",
  },
  description: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  codeContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  codeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  code: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
    letterSpacing: 4,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  copyButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
