import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, Platform } from "react-native";
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
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
      >
        {showIcon && (
          <Ionicons name="calendar-outline" size={20} color="#007AFF" />
        )}
        <Text style={styles.dateButtonText}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </TouchableOpacity>

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

const styles = StyleSheet.create({
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
});
