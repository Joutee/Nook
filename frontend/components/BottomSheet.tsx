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
const SNAP_POINT_HALF = SCREEN_HEIGHT * 0.5;
const SNAP_POINT_FULL = SCREEN_HEIGHT * 0.15; // 5% z vrchu = 95% výška

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  minHeight?: string;
  maxHeight?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  minHeight = "50%",
  maxHeight = "95%",
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const lastGestureY = useRef(0);
  const isAnimating = useRef(false);
  const startPosition = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5 && !isAnimating.current;
      },
      onPanResponderGrant: (_, gestureState) => {
        lastGestureY.current = gestureState.moveY;
        // Uložit aktuální pozici na začátku gesta
        const currentSnapPoint = isExpanded ? SNAP_POINT_FULL : SNAP_POINT_HALF;
        startPosition.current = currentSnapPoint;
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = startPosition.current + gestureState.dy;

        // Povolit pohyb dolů vždy, nahoru jen do SNAP_POINT_FULL
        if (gestureState.dy > 0) {
          // Pohyb dolů - povolit vždy
          translateY.setValue(newValue);
        } else if (newValue >= SNAP_POINT_FULL) {
          // Pohyb nahoru - jen do SNAP_POINT_FULL
          translateY.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = gestureState.vy;

        // Pokud je rozbalený a swipne dolů -> sbalit na polovinu
        if (isExpanded && (gestureState.dy > 50 || velocity > 0.3)) {
          snapTo(SNAP_POINT_HALF, () => setIsExpanded(false));
          return;
        }

        // Pokud je v polovině a swipne dolů -> zavřít
        if (!isExpanded && (gestureState.dy > 100 || velocity > 0.5)) {
          closeBottomSheet();
          return;
        }

        // Swipe nahoru z poloviny -> rozbalit
        if (!isExpanded && (gestureState.dy < -50 || velocity < -0.3)) {
          snapTo(SNAP_POINT_FULL, () => setIsExpanded(true));
          return;
        }

        // Jinak vrátit na současnou pozici
        const currentSnapPoint = isExpanded ? SNAP_POINT_FULL : SNAP_POINT_HALF;
        snapTo(currentSnapPoint);
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
      translateY.setValue(SCREEN_HEIGHT);
      setIsExpanded(false);
      snapTo(SNAP_POINT_HALF);
    }
  }, [visible]);

  const closeBottomSheet = () => {
    isAnimating.current = true;
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      isAnimating.current = false;
      onClose();
      setIsExpanded(false);
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeBottomSheet}
    >
      <Pressable style={styles.modalOverlay} onPress={closeBottomSheet}>
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              height: SCREEN_HEIGHT,
              paddingBottom: insets.bottom || 20,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.dragHandle} />
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>{title}</Text>
              <TouchableOpacity onPress={closeBottomSheet}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.content}>{children}</View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default BottomSheet;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
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
  content: {},
});
