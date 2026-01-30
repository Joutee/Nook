import React, { useRef, useEffect, ReactNode, useState } from "react";
import {
  StyleSheet,
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_HEIGHT_PERCENTAGE = 0.85; // Maximálně 85% obrazovky
const HEADER_HEIGHT = 80; // Přibližná výška headeru + drag handle

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const startPosition = useRef(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(SCREEN_HEIGHT * 0.5);

  // Vypočítat optimální výšku podle obsahu
  useEffect(() => {
    if (contentHeight > 0 && visible) {
      const totalHeight = contentHeight + HEADER_HEIGHT + (insets.bottom || 20);
      const maxHeight = SCREEN_HEIGHT * MAX_HEIGHT_PERCENTAGE;
      const optimalHeight = Math.min(totalHeight, maxHeight);
      setSheetHeight(optimalHeight);
    }
  }, [contentHeight, insets.bottom, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5 && !isAnimating.current;
      },
      onPanResponderGrant: (_, gestureState) => {
        startPosition.current = 0; // Současná pozice je 0 (viditelný)
      },
      onPanResponderMove: (_, gestureState) => {
        // gestureState.dy > 0 znamená pohyb dolů
        // Povolit jen tažení dolů (zvětšování translateY od 0 směrem k sheetHeight)
        if (gestureState.dy >= 0) {
          const newValue = gestureState.dy;
          if (newValue <= sheetHeight) {
            translateY.setValue(newValue);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = gestureState.vy;

        // Pokud je gesture rychlé dolů nebo táhne hodně dolů -> zavřít
        if (gestureState.dy > 100 || velocity > 0.5) {
          closeBottomSheet();
          return;
        }

        // Jinak vrátit na viditelnou pozici
        snapTo(0);
      },
    }),
  ).current;

  const snapTo = (position: number, callback?: () => void) => {
    isAnimating.current = true;
    Animated.spring(translateY, {
      toValue: position,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
      if (callback) callback();
    });
  };

  useEffect(() => {
    if (visible) {
      // Otevřít sheet
      translateY.setValue(sheetHeight);
      snapTo(0);
    } else {
      // Zavřít sheet a resetovat
      translateY.setValue(sheetHeight);
      setContentHeight(0);
      setSheetHeight(SCREEN_HEIGHT * 0.5);
    }
  }, [visible]);

  const closeBottomSheet = () => {
    isAnimating.current = true;
    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
      onClose();
    });
  };

  const handleContentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setContentHeight(height);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={closeBottomSheet}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalOverlay} onPress={closeBottomSheet} />
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              height: sheetHeight,
              paddingBottom: insets.bottom || 20,
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.headerContainer}>
            <View style={styles.dragHandle} />
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>{title}</Text>
              <TouchableOpacity onPress={closeBottomSheet}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.content} onLayout={handleContentLayout}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default BottomSheet;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 5,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  content: {
    minHeight: 100,
  },
});
