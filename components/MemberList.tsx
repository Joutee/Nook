import { View, TouchableOpacity, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";

export interface Member {
  id: string;
  name: string;
  surname: string;
  username?: string;
  avatar_url?: string | null;
  role: string;
}

interface MemberListProps {
  members: Member[];
  showActions?: boolean;
  isAdmin?: boolean;
  currentUserId?: string | null;
  onRemoveMember?: (memberId: string) => void;
  onChangeRole?: (memberId: string, currentRole: string) => void;
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case "pronajimatel":
      return "Pronajímatel";
    case "najemce":
      return "Nájemce";
    default:
      return role;
  }
};

export const MemberList = ({
  members,
  showActions = false,
  isAdmin = false,
  currentUserId = null,
  onRemoveMember,
  onChangeRole,
}: MemberListProps) => {
  if (members.length === 0) {
    return <Text className="text-muted-foreground text-sm">Žádní členové</Text>;
  }

  return (
    <View>
      {members.map((member) => {
        const showDeleteButton = isAdmin || member.id === currentUserId;

        return (
          <View
            key={member.id}
            className="flex-row items-center py-3 px-3 bg-card border border-border rounded-lg mb-2 gap-3"
          >
            <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
              <Text className="text-primary-foreground text-sm font-semibold">
                {member.name
                  ? member.name.charAt(0).toUpperCase()
                  : member.username
                    ? member.username.charAt(0).toUpperCase()
                    : "?"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {member.name && member.surname
                  ? `${member.name} ${member.surname}`
                  : member.name || member.username || "Neznámý uživatel"}
              </Text>
              <Pressable
                onPress={
                  isAdmin && onChangeRole
                    ? () => onChangeRole(member.id, member.role)
                    : undefined
                }
                disabled={!isAdmin || !onChangeRole}
                className="w-7/12"
              >
                <View className="flex-row items-center gap-1">
                  {isAdmin && onChangeRole && (
                    <Ionicons
                      name="swap-horizontal"
                      size={14}
                      className="text-primary"
                    />
                  )}
                  <Text
                    className={`text-xs ${
                      isAdmin && onChangeRole
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {getRoleLabel(member.role)}
                  </Text>
                </View>
              </Pressable>
            </View>
            {showDeleteButton && onRemoveMember && (
              <TouchableOpacity
                onPress={() => onRemoveMember(member.id)}
                className="p-2 ml-2"
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  className="text-destructive"
                />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
};
