import React from "react";
import { MemberSelectorButton } from "@/components/shared/MemberSelectorButton";
import { MemberSelectorSheet } from "@/components/shared/MemberSelectorSheet";
import { Member } from "@/types/members";

interface MemberSelectorProps {
  members: Member[];
  selectedMembers: Member[];
  onToggleMember: (member: Member) => void;
  multiSelect?: boolean;
  buttonText?: string;
  title?: string;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({
  members,
  selectedMembers,
  onToggleMember,
  multiSelect = true,
  buttonText,
  title,
}) => {
  const [showBottomSheet, setShowBottomSheet] = React.useState(false);

  return (
    <>
      <MemberSelectorButton
        selectedMembers={selectedMembers}
        onPress={() => setShowBottomSheet(true)}
        multiSelect={multiSelect}
        buttonText={buttonText}
      />

      <MemberSelectorSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        members={members}
        selectedMembers={selectedMembers}
        onToggleMember={onToggleMember}
        multiSelect={multiSelect}
        title={title}
      />
    </>
  );
};
