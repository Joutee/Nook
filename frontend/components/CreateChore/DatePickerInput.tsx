import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

interface DatePickerInputProps {
  value: string;
  onChange: (date: string) => void;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
}) => {
  const [showPicker, setShowPicker] = React.useState(false);
  const [dateObject, setDateObject] = React.useState(new Date());

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || dateObject;

    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (event.type === "set" && selectedDate) {
      setDateObject(currentDate);
      const formattedDate = currentDate.toISOString().split("T")[0];
      onChange(formattedDate);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowPicker(true)}
      >
        <Text style={{ color: value ? "#000" : "#999" }}>
          {value ? value : "Vyberte datum (např. 2026-02-01)"}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={dateObject}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onDateChange}
        />
      )}

      <Text style={styles.hint}>Formát: YYYY-MM-DD (vyberte z kalendáře)</Text>
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
});
