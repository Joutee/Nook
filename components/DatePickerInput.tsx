import React, { useState } from "react";
import { Platform, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

interface DatePickerInputProps {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  placeholder?: string;
  showIcon?: boolean;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  maximumDate,
  placeholder = "Vyberte datum",
  showIcon = true,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowPicker(Platform.OS === "ios");

    if (event.type === "set" && selectedDate) {
      onChange(selectedDate);
    } else if (Platform.OS === "android" && event.type === "dismissed") {
      setShowPicker(false);
    }
  };

  return (
    <>
      <Pressable
        className="flex-row items-center border border-border rounded-md p-3 dark:bg-input gap-2 shadow-sm shadow-black/5"
        onPress={() => setShowPicker(true)}
      >
        {showIcon && (
          <Ionicons
            name="calendar-outline"
            size={20}
            className="text-foreground"
          />
        )}
        <Text className="text-base text-foreground">
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={maximumDate}
        />
      )}
    </>
  );
};
