import React, { createContext, useContext, useState, ReactNode } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import {
  getToastIcon,
  getToastStyles,
  type ToastType,
} from "@/lib/toastConfig";

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

    const slideAnim = new Animated.Value(-100);
    setAnimations((prev) => new Map(prev).set(id, slideAnim));

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
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

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.toastContainer}>
        {toasts.map((toast) => {
          const slideAnim = animations.get(toast.id) || new Animated.Value(0);
          return (
            <Animated.View
              key={toast.id}
              className={`flex-row items-center p-4 rounded-xl mb-2.5 gap-3 ${getToastStyles(toast.type)}`}
              style={[
                styles.toast,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Ionicons
                name={getToastIcon(toast.type)}
                size={24}
                className="text-primary-foreground"
              />
              <Text className="text-white text-base font-medium flex-1">
                {toast.message}
              </Text>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
