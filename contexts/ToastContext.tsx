import React, { createContext, useContext, useState, ReactNode } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [animations, setAnimations] = useState<Map<number, Animated.Value>>(
    new Map(),
  );

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Date.now();
    const newToast: Toast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    // Animace
    const slideAnim = new Animated.Value(-100);
    setAnimations((prev) => new Map(prev).set(id, slideAnim));

    // Animace vjezdu
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Automatické odstranění po 3 sekundách
    setTimeout(() => {
      // Animace výjezdu
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        setAnimations((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      });
    }, 3000);
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      case "info":
        return "information-circle";
    }
  };

  const getToastColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "#28a745";
      case "error":
        return "#ff3b30";
      case "info":
        return "#007AFF";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.toastContainer}>
        {toasts.map((toast) => {
          const slideAnim = animations.get(toast.id) || new Animated.Value(0);
          return (
            <Animated.View
              key={toast.id}
              style={[
                styles.toast,
                {
                  backgroundColor: getToastColor(toast.type),
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Ionicons
                name={getToastIcon(toast.type)}
                size={24}
                color="#fff"
              />
              <Text style={styles.toastText}>{toast.message}</Text>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 12,
  },
  toastText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
});
