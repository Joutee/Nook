export const getRoleLabel = (role: string): string => {
  switch (role) {
    case "pronajimatel":
      return "Pronajímatel";
    case "najemce":
      return "Nájemce";
    default:
      return role;
  }
};
