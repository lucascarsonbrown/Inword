import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { Platform, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";

// Complete the auth session when the browser closes
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔐 Auth state changed - Event:", _event);
      console.log("🔐 Auth state changed - User:", session?.user ? "Signed in" : "Signed out");
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Handle deep link URL (for OAuth callback)
    const handleDeepLink = async (event: { url: string }) => {
      console.log("🔗 Deep link received:", event.url);

      // Check if this is an OAuth callback
      if (event.url.includes("auth/callback")) {
        console.log("✅ OAuth callback detected");

        // Extract the URL parameters
        const url = new URL(event.url);
        const access_token = url.searchParams.get("access_token");
        const refresh_token = url.searchParams.get("refresh_token");

        if (access_token && refresh_token) {
          console.log("🔐 Setting session from OAuth callback");
          // Set the session from the tokens
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
        }
      }
    };

    // Listen for deep links
    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("🔗 App opened with URL:", url);
        handleDeepLink({ url });
      }
    });

    return () => {
      authSubscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    console.log("🔐 Starting Google Sign-In...");
    console.log("📱 Platform:", Platform.OS);

    try {
      // Create redirect URL for mobile deep linking
      const redirectTo = Platform.select({
        default: "inword://auth/callback",
        web: `${window.location.origin}/auth/callback`,
      });

      console.log("🔗 Redirect URL we're sending:", redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo,
          skipBrowserRedirect: Platform.OS === "web" ? false : true, // Skip auto-redirect on mobile
        },
      });

      if (error) {
        console.error("❌ Google Sign-In error:", error);
        return { error };
      }

      console.log("✅ Google Sign-In initiated");
      console.log("📱 Full OAuth URL:", data?.url);

      // Check if the OAuth URL contains our redirect URL
      if (data?.url) {
        if (data.url.includes("inword://")) {
          console.log("✅ OAuth URL contains deep link - GOOD!");
        } else if (data.url.includes("localhost")) {
          console.log("❌ OAuth URL contains localhost - BAD! Supabase is overriding redirect URL");
          console.log("🔧 Check Supabase Site URL setting - it's probably set to localhost");
        } else {
          console.log("⚠️ OAuth URL contains different redirect:", data.url);
        }
      }

      // On mobile, manually open the OAuth URL in a browser
      if (Platform.OS !== "web" && data?.url) {
        console.log("📱 Opening browser...");

        // Open the OAuth URL in an in-app browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo!
        );

        console.log("🌐 Browser result type:", result.type);
        console.log("🌐 Browser result URL:", result.url);

        if (result.type === "success" && result.url) {
          console.log("🔍 Parsing callback URL for tokens...");

          // Supabase OAuth returns tokens in BOTH formats, try both
          let access_token: string | null = null;
          let refresh_token: string | null = null;

          try {
            // Method 1: Try query parameters (e.g., ?access_token=...)
            const url = new URL(result.url);
            access_token = url.searchParams.get("access_token");
            refresh_token = url.searchParams.get("refresh_token");

            console.log("🔍 Query params - access_token:", access_token ? "YES" : "NO");
            console.log("🔍 Query params - refresh_token:", refresh_token ? "YES" : "NO");

            // Method 2: Try hash fragments (e.g., #access_token=...)
            if (!access_token && url.hash) {
              console.log("🔍 Trying hash fragments:", url.hash);
              const hashParams = new URLSearchParams(url.hash.substring(1));
              access_token = hashParams.get("access_token");
              refresh_token = hashParams.get("refresh_token");

              console.log("🔍 Hash params - access_token:", access_token ? "YES" : "NO");
              console.log("🔍 Hash params - refresh_token:", refresh_token ? "YES" : "NO");
            }

            // Method 3: Manual parsing as fallback
            if (!access_token) {
              console.log("🔍 Trying manual parsing...");
              const matches = result.url.match(/access_token=([^&]+)/);
              if (matches) {
                access_token = matches[1];
                console.log("🔍 Manual parse - access_token: YES");
              }

              const refreshMatches = result.url.match(/refresh_token=([^&]+)/);
              if (refreshMatches) {
                refresh_token = refreshMatches[1];
                console.log("🔍 Manual parse - refresh_token: YES");
              }
            }

            console.log("🔑 Final - Access token found:", access_token ? "YES" : "NO");
            console.log("🔑 Final - Refresh token found:", refresh_token ? "YES" : "NO");

            if (access_token && refresh_token) {
              console.log("🔐 Setting session from OAuth callback");
              await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              console.log("✅ Session set successfully!");
            } else {
              console.error("❌ No tokens found in callback URL");
              console.error("📋 Full URL for debugging:", result.url);
            }
          } catch (parseError) {
            console.error("❌ Error parsing callback URL:", parseError);
            console.error("📋 URL:", result.url);
          }
        } else if (result.type === "cancel") {
          console.log("⚠️ User cancelled browser");
        } else {
          console.log("❌ Browser result was not success:", result.type);
        }
      }

      return { error: null };
    } catch (err) {
      console.error("❌ Google Sign-In exception:", err);
      return { error: err };
    }
  };

  const signOut = async () => {
    console.log("🔓 AuthContext - Signing out...");
    await supabase.auth.signOut();
    console.log("✅ AuthContext - Sign out complete");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
