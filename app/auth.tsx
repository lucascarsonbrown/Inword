import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, signInWithGoogle } = useAuth();

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        Alert.alert("Error", error.message);
      } else if (isSignUp) {
        Alert.alert("Success", "Account created! Please check your email to verify.");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert("Error", error.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="planet" size={64} color="#E0C3FC" />
            <Text style={styles.title}>InWord</Text>
            <Text style={styles.subtitle}>
              Your journey to growth and fulfillment begins here
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail" size={20} color="#8EA7E9" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#8EA7E9"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed" size={20} color="#8EA7E9" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#8EA7E9"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ["#3a3a52", "#2d2d44"] : ["#667eea", "#764ba2"]}
                style={styles.authButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={isSignUp ? "person-add" : "log-in"}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.authButtonText}>
                      {isSignUp ? "Create Account" : "Sign In"}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <View style={styles.googleButtonContent}>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp
                  ? "Already have an account? Sign In"
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.starsDecoration}>
              <Ionicons name="star" size={12} color="#4a4a68" />
              <Ionicons name="star" size={8} color="#4a4a68" />
              <Ionicons name="star" size={10} color="#4a4a68" />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: "700",
    color: "#fff",
    marginTop: 20,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#B8A4D6",
    marginTop: 12,
    textAlign: "center",
    fontStyle: "italic",
    maxWidth: 280,
  },
  formContainer: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#fff",
  },
  authButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    elevation: 5,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  authButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
  },
  authButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(224, 195, 252, 0.2)",
  },
  dividerText: {
    fontSize: 12,
    color: "#8EA7E9",
    marginHorizontal: 16,
    fontWeight: "600",
  },
  googleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.3)",
    overflow: "hidden",
  },
  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  switchButton: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  switchButtonText: {
    fontSize: 14,
    color: "#8EA7E9",
    fontWeight: "600",
  },
  footer: {
    marginTop: 60,
    alignItems: "center",
  },
  starsDecoration: {
    flexDirection: "row",
    gap: 12,
  },
});
