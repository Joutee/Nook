import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";

import { Avatar } from "@/components/ui/avatar";
import { Ionicons } from "@expo/vector-icons";
import { MemberSelectorSheet } from "@/components/shared/MemberSelectorSheet";
import { Member } from "@/types/members";
import { ExpenseItem } from "@/types/finance";
import { formatCurrency } from "@/lib/financeUtils";

interface ReceiptItemListProps {
  items: ExpenseItem[];
  onItemsChange: (items: ExpenseItem[]) => void;
  flatMembers: Member[];
}

export const ReceiptItemList: React.FC<ReceiptItemListProps> = ({
  items,
  onItemsChange,
  flatMembers,
}) => {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const handleMemberToggle = (member: Member) => {
    if (editingItemIndex === null) return;

    const item = items[editingItemIndex];
    const hasMember = item.memberIds.includes(member.id);

    const updatedItems = [...items];
    updatedItems[editingItemIndex] = {
      ...item,
      memberIds: hasMember
        ? item.memberIds.filter((id) => id !== member.id)
        : [...item.memberIds, member.id],
    };
    onItemsChange(updatedItems);
  };

  const handleNameChange = (index: number, name: string) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], name };
    onItemsChange(updatedItems);
  };

  const handlePriceChange = (index: number, priceStr: string) => {
    const updatedItems = [...items];
    const price = parseFloat(priceStr) || 0;
    updatedItems[index] = { ...updatedItems[index], price };
    onItemsChange(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, position: i }));
    onItemsChange(updatedItems);
  };

  const handleAddItem = () => {
    const newItem: ExpenseItem = {
      name: "",
      price: 0,
      position: items.length,
      memberIds: flatMembers.map((m) => m.id),
    };
    onItemsChange([...items, newItem]);
  };

  const getSelectedMembersForItem = (item: ExpenseItem): Member[] => {
    return flatMembers.filter((m) => item.memberIds.includes(m.id));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <View>
      {items.map((item, index) => (
        <View
          key={index}
          className="mb-2 bg-secondary rounded-lg p-3"
        >
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-1 mr-2">
              <Input
                value={item.name}
                onChangeText={(val) => handleNameChange(index, val)}
                placeholder="Název položky"
                className="text-sm h-8"
              />
            </View>
            <View className="w-24 mr-2">
              <Input
                value={item.price > 0 ? item.price.toString() : ""}
                onChangeText={(val) => handlePriceChange(index, val)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                className="text-sm h-8 text-right"
              />
            </View>
            <Pressable onPress={() => handleRemoveItem(index)} className="p-1">
              <Ionicons
                name="close-circle-outline"
                size={20}
                className="text-destructive"
              />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setEditingItemIndex(index)}
            className="flex-row items-center gap-1 mt-1"
          >
            <View className="flex-row flex-1">
              {getSelectedMembersForItem(item).length === 0 ? (
                <Text className="text-xs text-muted-foreground italic">
                  Klikněte pro přiřazení členů
                </Text>
              ) : (
                <View className="flex-row items-center gap-0.5 flex-wrap">
                  {getSelectedMembersForItem(item).map((member) => (
                    <Avatar
                      key={member.id}
                      name={member.name}
                      imageUrl={member.avatar_url}
                      size="sm"
                    />
                  ))}
                  <Text className="text-xs text-muted-foreground ml-1">
                    {formatCurrency(
                      item.price / (item.memberIds.length || 1),
                    )}
                    /os.
                  </Text>
                </View>
              )}
            </View>
            <Ionicons
              name="people-outline"
              size={16}
              className="text-muted-foreground"
            />
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={handleAddItem}
        className="flex-row items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg mb-2"
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          className="text-primary"
        />
        <Text className="text-primary text-sm font-medium">
          Přidat položku
        </Text>
      </Pressable>

      <Text className="text-sm text-muted-foreground font-light italic">
        Celkem: {formatCurrency(total)}
      </Text>

      {editingItemIndex !== null && (
        <MemberSelectorSheet
          visible={true}
          onClose={() => setEditingItemIndex(null)}
          members={flatMembers}
          selectedMembers={getSelectedMembersForItem(items[editingItemIndex])}
          onToggleMember={handleMemberToggle}
          multiSelect={true}
          title="Kdo platí tuto položku?"
        />
      )}
    </View>
  );
};
