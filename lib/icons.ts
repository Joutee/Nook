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

// Register all icon sets used by the project here.
registerIcon(Ionicons);
