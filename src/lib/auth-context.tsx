"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monitor auth state changes
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setError(
        "Firebase is not initialized. Please configure your Firebase credentials."
      );
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      if (!auth || !googleProvider) {
        throw new Error("Firebase is not initialized");
      }
      setError(null);
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to sign in with Google";
      setError(errorMessage);
      console.error("Google Sign-In Error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      if (!auth) {
        throw new Error("Firebase is not initialized");
      }
      setError(null);
      await signOut(auth);
      setUser(null);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to sign out";
      setError(errorMessage);
      console.error("Sign-Out Error:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
