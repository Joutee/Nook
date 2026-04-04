import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import { RecurringInterval } from "@/types/finance";

interface RecurringIntervalPickerProps {
  interval: RecurringInterval;
  onIntervalChange: (interval: RecurringInterval) => void;
  intervalDay: number;
  onIntervalDayChange: (day: number) => void;
  intervalMonth: number;
  onIntervalMonthChange: (month: number) => void;
  customDays: number;
  onCustomDaysChange: (days: number) => void;
}

const INTERVALS: { value: RecurringInterval; label: string }[] = [
  { value: "daily", label: "Denně" },
  { value: "weekly", label: "Týdně" },
  { value: "monthly", label: "Měsíčně" },
  { value: "yearly", label: "Ročně" },
  { value: "custom", label: "Vlastní" },
];

const DAYS_OF_WEEK = [
  { value: 1, label: "Po" },
  { value: 2, label: "Út" },
  { value: 3, label: "St" },
  { value: 4, label: "Čt" },
  { value: 5, label: "Pá" },
  { value: 6, label: "So" },
  { value: 7, label: "Ne" },
];

const MONTHS = [
  { value: 1, label: "Led" },
  { value: 2, label: "Úno" },
  { value: 3, label: "Bře" },
  { value: 4, label: "Dub" },
  { value: 5, label: "Kvě" },
  { value: 6, label: "Čer" },
  { value: 7, label: "Čvc" },
  { value: 8, label: "Srp" },
  { value: 9, label: "Zář" },
  { value: 10, label: "Říj" },
  { value: 11, label: "Lis" },
  { value: 12, label: "Pro" },
];

function handleDayInput(text: string, setter: (day: number) => void) {
  const num = parseInt(text, 10);
  if (!isNaN(num) && num >= 1 && num <= 31) {
    setter(num);
  } else if (text === "") {
    setter(1);
  }
}

export const RecurringIntervalPicker: React.FC<
  RecurringIntervalPickerProps
> = ({
  interval,
  onIntervalChange,
  intervalDay,
  onIntervalDayChange,
  intervalMonth,
  onIntervalMonthChange,
  customDays,
  onCustomDaysChange,
}) => {
  return (
    <Card>
      <CardContent className="gap-4">
        {/* Interval picker */}
        <View className="gap-2">
          <Label>Interval</Label>
          <View className="flex-row gap-2">
            {INTERVALS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => onIntervalChange(item.value)}
                className={`flex-1 py-2 rounded-md items-center border ${
                  interval === item.value
                    ? "border-primary bg-muted"
                    : "border-transparent bg-muted"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    interval === item.value
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Weekly: day-of-week picker */}
        {interval === "weekly" && (
          <View className="gap-2">
            <Label>Den v týdnu</Label>
            <View className="flex-row gap-1">
              {DAYS_OF_WEEK.map((day) => (
                <Pressable
                  key={day.value}
                  onPress={() => onIntervalDayChange(day.value)}
                  className={`flex-1 py-2 rounded-md items-center border ${
                    intervalDay === day.value
                      ? "border-primary bg-muted"
                      : "border-transparent bg-muted"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      intervalDay === day.value
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Monthly: day-of-month input */}
        {interval === "monthly" && (
          <View className="gap-2">
            <Label>Den v měsíci</Label>
            <View className="flex-row items-center gap-3">
              <Input
                className="w-20"
                keyboardType="number-pad"
                maxLength={2}
                value={String(intervalDay)}
                onChangeText={(text) =>
                  handleDayInput(text, onIntervalDayChange)
                }
              />
              <Text className="text-muted-foreground text-sm flex-1">
                každého měsíce
              </Text>
            </View>
          </View>
        )}

        {/* Yearly: day + month picker */}
        {interval === "yearly" && (
          <View className="gap-2">
            <Label>Den a měsíc</Label>
            <View className="flex-row items-center gap-3 mb-2">
              <Input
                className="w-20"
                keyboardType="number-pad"
                maxLength={2}
                value={String(intervalDay)}
                onChangeText={(text) =>
                  handleDayInput(text, onIntervalDayChange)
                }
              />
              <Text className="text-muted-foreground text-sm flex-1">dne</Text>
            </View>
            <View className="flex-row flex-wrap gap-1">
              {MONTHS.map((month) => (
                <Pressable
                  key={month.value}
                  onPress={() => onIntervalMonthChange(month.value)}
                  className={`px-3 py-2 rounded-md items-center border ${
                    intervalMonth === month.value
                      ? "border-primary bg-muted"
                      : "border-transparent bg-muted"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      intervalMonth === month.value
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {month.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {/* Custom: number of days input */}
        {interval === "custom" && (
          <View className="gap-2">
            <Label>Počet dní</Label>
            <View className="flex-row items-center gap-3">
              <Input
                className="w-20"
                keyboardType="number-pad"
                maxLength={3}
                value={String(customDays)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num >= 1 && num <= 365) {
                    onCustomDaysChange(num);
                  } else if (text === "") {
                    onCustomDaysChange(1);
                  }
                }}
              />
              <Text className="text-muted-foreground text-sm flex-1">
                {customDays === 1 ? "den" : "dní"}
              </Text>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
};
