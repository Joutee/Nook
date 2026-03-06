import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import PasswordVerification from "../components/PasswordVerification";
import EmailVerification from "../components/EmailVerification";

export default function ChangeEmail() {
  const [currentEmail, setCurrentEmail] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentEmail(user.email);
      }
    };
    getCurrentUser();
  }, []);

  const handleSuccess = () => {
    router.back(); // Návrat zpět do Nastavení
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
    >
      <View className="flex-1 bg-background justify-center p-5">
        {!isPasswordVerified ? (
          <PasswordVerification
            onVerified={() => setIsPasswordVerified(true)}
            onCancel={() => router.back()}
            title="Ověření totožnosti"
            description="Pro změnu e-mailu zadejte své současné heslo"
          />
        ) : (
          <EmailVerification
            mode="change"
            currentEmail={currentEmail}
            onSuccess={handleSuccess}
          />
        )}
      </View>
    </KeyboardAwareScrollView>
  );
}
