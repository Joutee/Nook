export type ToastType = "success" | "error" | "info";

export const getToastIcon = (type: ToastType) => {
  switch (type) {
    case "success":
      return "checkmark-circle";
    case "error":
      return "alert-circle";
    case "info":
      return "information-circle";
  }
};

export const getToastStyles = (type: ToastType) => {
  switch (type) {
    case "success":
      return "bg-success";
    case "error":
      return "bg-destructive";
    case "info":
      return "bg-primary";
  }
};
