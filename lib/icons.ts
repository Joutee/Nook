import { Ionicons } from "@expo/vector-icons";
import { cssInterop } from "nativewind";

function registerIcon(icon: any) {
  cssInterop(icon, {
    className: {
      target: "style",
      nativeStyleToProp: { color: true },
    },
  });
}

// Zde zaregistruješ všechny sady, které v projektu používáš
registerIcon(Ionicons);
