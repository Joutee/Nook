import React from "react";
import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import EmailVerification from "../components/EmailVerification";

export default function VerifyEmail() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const handleSuccess = () => {
    // Po úspěšné verifikaci je uživatel přihlášen a můžeme ho přesměrovat
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
    >
      <View className="flex-1 bg-background justify-center p-5">
        <EmailVerification
          mode="verify"
          email={email}
          onSuccess={handleSuccess}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
