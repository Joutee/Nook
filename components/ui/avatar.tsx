import { useState, useEffect } from "react";
import { Image, View } from "react-native";
import { Text } from "@/components/ui/text";

type AvatarSize = "xs" | "sm" | "md" | "base" | "lg" | "xl" | "2xl";

interface AvatarProps {
  name?: string | null;
  imageUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CONFIG: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: "w-4 h-4", text: "text-[8px] font-bold" },
  sm: { container: "w-5 h-5", text: "text-[9px] font-bold" },
  md: { container: "w-6 h-6", text: "text-xs font-semibold" },
  base: { container: "w-7 h-7", text: "text-sm font-semibold" },
  lg: { container: "w-8 h-8", text: "text-sm font-semibold" },
  xl: { container: "w-10 h-10", text: "text-base font-semibold" },
  "2xl": { container: "w-20 h-20", text: "text-3xl font-bold" },
};

function getInitials(name?: string | null): string {
  return name?.charAt(0)?.toUpperCase() || "?";
}

export function Avatar({
  name,
  imageUrl,
  size = "lg",
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const { container, text } = SIZE_CONFIG[size];

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const showImage = !!imageUrl && !imageError;

  return (
    <View
      className={`${container} rounded-full bg-primary items-center justify-center overflow-hidden${className ? ` ${className}` : ""}`}
    >
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-full"
          onError={() => setImageError(true)}
        />
      ) : (
        <Text className={`${text} text-primary-foreground`}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
