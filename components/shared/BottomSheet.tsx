import React, { useRef, useEffect, ReactNode, useState } from "react";
import {
  Modal,
  Pressable,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_HEIGHT_PERCENTAGE = 0.85; // Maximálně 85% obrazovky
const MIN_HEIGHT_PERCENTAGE = 0.35; // Minimálně 30% obrazovky
const HEADER_HEIGHT = 80; // Přibližná výška headeru + drag handle

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  headerActions?: ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  headerActions,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const startPosition = useRef(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(
    SCREEN_HEIGHT * MIN_HEIGHT_PERCENTAGE,
  );

  // Vypočítat optimální výšku podle obsahu
  useEffect(() => {
    if (contentHeight > 0 && visible) {
      const totalHeight = contentHeight + HEADER_HEIGHT + (insets.bottom || 20);
      const maxHeight = SCREEN_HEIGHT * MAX_HEIGHT_PERCENTAGE;
      const minHeight = SCREEN_HEIGHT * MIN_HEIGHT_PERCENTAGE;
      const optimalHeight = Math.max(
        minHeight,
        Math.min(totalHeight, maxHeight),
      );
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
    Animated.timing(translateY, {
      toValue: position,
      duration: 300,
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
      setSheetHeight(SCREEN_HEIGHT * MIN_HEIGHT_PERCENTAGE);
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
      <View className="flex-1">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={closeBottomSheet}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: sheetHeight,
              paddingBottom: insets.bottom || 20,
              transform: [{ translateY }],
            },
          ]}
          className="bg-card rounded-t-3xl"
        >
          <View {...panResponder.panHandlers} className="bg-card rounded-t-3xl">
            <View className="w-10 h-1 bg-border rounded-full self-center mt-2.5 mb-1" />
            <View className="flex-row justify-between items-center p-5">
              <Text className="text-xl font-semibold text-foreground">
                {title}
              </Text>
              <View className="flex-row items-center gap-4">
                {headerActions}
                <TouchableOpacity onPress={closeBottomSheet}>
                  <Ionicons
                    name="close"
                    size={24}
                    className="text-foreground"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View className="min-h-[100px] pt-3" onLayout={handleContentLayout}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default BottomSheet;
