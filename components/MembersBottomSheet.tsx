import React from "react";
import { View } from "react-native";
import { MemberList } from "@/components/MemberList";
import BottomSheet from "./BottomSheet";

interface MembersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const MembersBottomSheet: React.FC<MembersBottomSheetProps> = ({
  visible,
  onClose,
}) => {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Členové bytu">
      <View className="px-4 py-2">
        <MemberList showActions={true} />
      </View>
    </BottomSheet>
  );
};

export default MembersBottomSheet;
