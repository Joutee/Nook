import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useFlatContext } from "@/contexts/FlatContext";
import { useToast } from "@/contexts/ToastContext";
import CodeModal from "@/components/flats/CodeModal";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as Crypto from "expo-crypto";

interface CreateFlatFormProps {
  showBackButton?: boolean;
  onSuccess?: () => void;
}

export default function CreateFlatForm({
  showBackButton = true,
  onSuccess,
}: CreateFlatFormProps) {
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const modalResolveRef = React.useRef<(() => void) | null>(null);
  const router = useRouter();
  const { refreshFlats, setCurrentFlat } = useFlatContext();
  const { showToast } = useToast();

  const generateCode = () => {
    const bytes = Crypto.getRandomBytes(6);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  };

  const waitForModalClose = (): Promise<void> => {
    return new Promise((resolve) => {
      modalResolveRef.current = resolve;
    });
  };

  const handleModalClose = () => {
    setShowCodeModal(false);
    if (modalResolveRef.current) {
      modalResolveRef.current();
      modalResolveRef.current = null;
    }
    if (onSuccess) {
      onSuccess();
    }
  };

  const generateUniqueCode = async (): Promise<string> => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = generateCode();

      const { data, error } = await supabase
        .from("flats")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      // If there is no row, the code is unique.
      if (!data && !error) {
        return code;
      }

      attempts++;
    }

    return generateCode();
  };

  const handleCreateFlat = async () => {
    if (!address.trim()) {
      showToast("Zadejte adresu bytu", "error");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast("Nejste přihlášeni", "error");
        setLoading(false);
        return;
      }

      const code = await generateUniqueCode();
      const flatId = Crypto.randomUUID();

      const { error: flatError } = await supabase.from("flats").insert({
        id: flatId,
        code: code,
        address: address.trim(),
        name: name.trim(),
      });

      if (flatError) {
        showToast("Nepodařilo se vytvořit byt: " + flatError?.message, "error");
        setLoading(false);
        return;
      }

      const { error: joinError } = await supabase.from("flat_profile").insert({
        flat_id: flatId,
        profile_id: user.id,
        role: null,
        active: true,
      });

      if (joinError) {
        showToast(
          "Byt byl vytvořen, ale nepodařilo se vás přidat: " +
            joinError.message,
          "error",
        );
        setLoading(false);
        return;
      }

      const { data: flatData, error: flatDataError } = await supabase
        .from("flats")
        .select("id, name, address")
        .eq("id", flatId)
        .single();

      setGeneratedCode(code);
      setShowCodeModal(true);
      await waitForModalClose();

      // Continue updating context only after the code modal closes.
      if (!flatDataError && flatData) {
        setCurrentFlat(flatData);
      }
      await refreshFlats();
      setLoading(false);
    } catch (error: any) {
      showToast(error.message, "error");
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      extraScrollHeight={20}
    >
      <View className="flex-1 bg-background justify-center p-5">
        <CodeModal
          visible={showCodeModal}
          code={generatedCode}
          onClose={handleModalClose}
        />
        <Card className="max-w-md w-full mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Vytvořit novou domácnost
            </CardTitle>
            <CardDescription className="text-center">
              Zadejte adresu bytu. Po vytvoření obdržíte kód, který můžete
              sdílet s ostatními.
            </CardDescription>
          </CardHeader>

          <CardContent className="gap-4">
            <View className="gap-2">
              <Label>Adresa bytu</Label>
              <Input
                placeholder="např. Vodičkova 12, Praha"
                value={address}
                onChangeText={setAddress}
                editable={!loading}
              />
            </View>

            <View className="gap-2">
              <Label>Název bytu (volitelné)</Label>
              <Input
                placeholder="např. Náš byt"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            <Button onPress={handleCreateFlat} disabled={loading}>
              <Text>{loading ? "Vytváření..." : "Vytvořit domácnost"}</Text>
            </Button>

            {showBackButton && (
              <Button
                variant="ghost"
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text>Zpět</Text>
              </Button>
            )}
          </CardContent>
        </Card>
      </View>
    </KeyboardAwareScrollView>
  );
}
