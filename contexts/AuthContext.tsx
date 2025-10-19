import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize anonymous session automatically
    const initAuth = async () => {
      console.log("🔐 Initializing device-based auth...");

      // Check if we already have a session
      const { data: { session: existingSession } } = await supabase.auth.getSession();

      if (existingSession) {
        console.log("✅ Found existing session");
        setSession(existingSession);
        setUser(existingSession.user);
        setLoading(false);
      } else {
        // No session - create anonymous user automatically
        console.log("🆕 No session found, creating anonymous user...");
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) {
          console.error("❌ Failed to create anonymous session:", error);
        } else {
          console.log("✅ Anonymous session created");
          setSession(data.session);
          setUser(data.user);
        }
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔐 Auth state changed - Event:", _event);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
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
