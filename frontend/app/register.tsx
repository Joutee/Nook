import { useState } from "react";
import { supabase } from "../utils/supabase";
import { getErrorMessage } from "../utils/errorTranslations";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
    if (password !== confirmPassword) {
      Alert.alert("Chyba", getErrorMessage("PASSWORDS_DO_NOT_MATCH"));
      return;
    }

    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
          surname: surname,
        },
      },
    });

    if (error) {
      Alert.alert("Chyba", getErrorMessage(error.message));
    } else {
      Alert.alert("Registrace úspěšná!", "Vítejte v aplikaci!");
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrace</Text>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Jméno</Text>
        <TextInput
          style={styles.input}
          onChangeText={(text: string) => setName(text)}
          value={name}
          placeholder="Jan"
          autoCapitalize={"words"}
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Příjmení</Text>
        <TextInput
          style={styles.input}
          onChangeText={(text: string) => setSurname(text)}
          value={surname}
          placeholder="Novák"
          autoCapitalize={"words"}
        />
      </View>

      <View style={styles.verticallySpaced}>
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

      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Potvrzení hesla</Text>
        <TextInput
          style={styles.input}
          onChangeText={(text: string) => setConfirmPassword(text)}
          value={confirmPassword}
          secureTextEntry={true}
          placeholder="Zadejte heslo znovu"
          autoCapitalize={"none"}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={loading}
          onPress={() => signUpWithEmail()}
        >
          <Text style={styles.buttonText}>Registrovat se</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.verticallySpaced}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.secondaryButtonText}>Zpět na přihlášení</Text>
        </TouchableOpacity>
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
