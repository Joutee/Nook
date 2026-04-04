export const getErrorMessage = (errorMessage: string): string => {
  const errorMap: { [key: string]: string } = {
    // Auth errors
    "Invalid login credentials": "Zadali jste špatný e-mail nebo heslo.",
    "User already registered": "Registrace se nezdařila. Zkuste to prosím znovu.",
    "A user with this email address has already been registered":
      "Registrace se nezdařila. Zkuste to prosím znovu.",
    "Email not confirmed":
      "Neplatné přihlašovací údaje nebo účet neexistuje.",
    "Password should be at least 6 characters":
      "Heslo musí mít alespoň 6 znaků.",
    "Unable to validate email address: invalid format":
      "Neplatný formát e-mailové adresy.",
    "Signup requires a valid password": "Registrace vyžaduje platné heslo.",
    "Email rate limit exceeded":
      "Příliš mnoho pokusů. Zkuste to prosím později.",
    "you can only request this after":
      "Počkejte prosím chvíli a zkuste to znovu.",
    "User not found": "Neplatné přihlašovací údaje nebo účet neexistuje.",
    "Invalid email or password": "Neplatný e-mail nebo heslo.",
    "Email link is invalid or has expired":
      "E-mailový odkaz je neplatný nebo vypršel.",
    "Token has expired or is invalid": "Token vypršel nebo je neplatný.",
    "User already exists": "Registrace se nezdařila. Zkuste to prosím znovu.",
    "Signups not allowed for this instance":
      "Registrace není pro tuto instanci povolena.",

    // Database errors
    "Database error saving new user":
      "Chyba databáze při ukládání nového uživatele.",
    "Failed to fetch": "Nepodařilo se připojit k serveru.",

    // Network errors
    "Network request failed":
      "Síťové připojení selhalo. Zkontrolujte své připojení k internetu.",
    timeout: "Časový limit vypršel. Zkuste to prosím znovu.",

    // Validation errors
    PASSWORDS_DO_NOT_MATCH: "Hesla se neshodují.",
    PASSWORD_TOO_SHORT: "Heslo musí mít alespoň 6 znaků.",
    EMAIL_REQUIRED: "E-mail je povinný.",
    PASSWORD_REQUIRED: "Heslo je povinné.",
  };

  // Pokus najít přesnou shodu
  if (errorMap[errorMessage]) {
    return errorMap[errorMessage];
  }

  // Pokus najít částečnou shodu
  for (const [key, value] of Object.entries(errorMap)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Výchozí zpráva
  return "Něco se nepovedlo. Zkuste to prosím znovu.";
};
