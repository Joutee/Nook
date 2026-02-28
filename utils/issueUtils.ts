export const getStatusColor = (status: string): string => {
  switch (status) {
    case "new":
      return "hsl(217, 91%, 60%)";
    case "in_progress":
      return "hsl(38, 92%, 50%)";
    case "resolved":
      return "hsl(142, 71%, 45%)";
    case "cancelled":
      return "hsl(0, 84%, 60%)";
    default:
      return "hsl(240, 5%, 64.9%)";
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case "new":
      return "Nová";
    case "in_progress":
      return "Řeší se";
    case "resolved":
      return "Vyřešená";
    case "cancelled":
      return "Zrušená";
    default:
      return status;
  }
};
