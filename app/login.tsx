import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../utils/supabase";
import { getErrorMessage } from "../utils/errorTranslations";
import { Link } from "expo-router";
import { useToast } from "../contexts/ToastContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [buttonLoading, setButtonLoading] = useState(false);
  const { showToast } = useToast();

  async function signInWithEmail() {
    setButtonLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) showToast(getErrorMessage(error.message), "error");
    else showToast("Přihlášení bylo úspěšné", "success");

    setButtonLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Přihlášení</Text>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          onChangeText={(text: string) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={"none"}
          keyboardType="email-address"
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Heslo</Text>
        <TextInput
          style={styles.input}
          onChangeText={(text: string) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Heslo"
          autoCapitalize={"none"}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          style={[styles.button, buttonLoading && styles.buttonDisabled]}
          disabled={buttonLoading}
          onPress={() => signInWithEmail()}
        >
          <Text style={styles.buttonText}>Přihlásit se</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.verticallySpaced}>
        <Link href="/register" asChild>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Registrovat se</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: "stretch",
  },
  mt20: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
