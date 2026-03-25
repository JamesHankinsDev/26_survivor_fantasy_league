"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { authLogger } from "@/lib/logger";
import { DEMO_USER_ID } from "@/data/demo-data";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  completeMagicLinkSignIn: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DEMO_USER_OBJECT = {
  uid: DEMO_USER_ID,
  displayName: "Demo Player",
  email: "demo@survivorfantasy.com",
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerData: [],
  metadata: {},
  tenantId: null,
  refreshToken: "",
  getIdToken: async () => "",
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  delete: async () => {},
} as unknown as User;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("survivor_demo_mode") === "true";
  });

  const enterDemoMode = () => {
    localStorage.setItem("survivor_demo_mode", "true");
    setIsDemoMode(true);
  };

  const exitDemoMode = () => {
    localStorage.removeItem("survivor_demo_mode");
    setIsDemoMode(false);
    setUser(null);
  };

  // Monitor auth state changes
  useEffect(() => {
    if (isDemoMode) {
      setUser(DEMO_USER_OBJECT);
      setLoading(false);
      return;
    }

    if (!auth) {
      setLoading(false);
      setError(
        "Firebase is not initialized. Please configure your Firebase credentials.",
      );
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // Create user document in Firestore if it doesn't exist
      if (currentUser) {
        try {
          const { uid, displayName, email, photoURL } = currentUser;
          const userRef = doc(db, "users", uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              displayName: displayName || "",
              email: email || "",
              avatar: photoURL || "",
              joinedAt: serverTimestamp(),
              tutorialCompleted: false,
            });
          }
        } catch (err) {
          authLogger.error("Error creating user document:", err);
        }
      }
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      if (!auth || !googleProvider) {
        throw new Error("Firebase is not initialized");
      }
      setError(null);
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(errorMessage);
      authLogger.error("Google Sign-In Error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      if (!auth) {
        throw new Error("Firebase is not initialized");
      }
      setError(null);
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create account";
      setError(errorMessage);
      authLogger.error("Email Sign-Up Error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      if (!auth) {
        throw new Error("Firebase is not initialized");
      }
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
      authLogger.error("Email Sign-In Error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Send magic link to email
  const sendMagicLink = async (email: string) => {
    try {
      if (!auth) {
        throw new Error("Firebase is not initialized");
      }
      setError(null);
      const actionCodeSettings = {
        // URL you want to redirect back to after email link is clicked
        url: `${window.location.origin}/auth/verify`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Save email locally to complete sign-in after redirect
      window.localStorage.setItem("emailForSignIn", email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send magic link";
      setError(errorMessage);
      authLogger.error("Magic Link Error:", err);
      throw err;
    }
  };

  // Complete magic link sign in
  const completeMagicLinkSignIn = async (email: string) => {
    try {
      if (!auth) {
        throw new Error("Firebase is not initialized");
      }

      if (isSignInWithEmailLink(auth, window.location.href)) {
        setError(null);
        setLoading(true);
        await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem("emailForSignIn");
      } else {
        throw new Error("Invalid sign-in link");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to complete sign-in";
      setError(errorMessage);
      authLogger.error("Magic Link Verification Error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    if (isDemoMode) {
      exitDemoMode();
      return;
    }
    try {
      if (!auth) {
        throw new Error("Firebase is not initialized");
      }
      setError(null);
      await signOut(auth);
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign out";
      setError(errorMessage);
      authLogger.error("Sign-Out Error:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isDemoMode,
        enterDemoMode,
        exitDemoMode,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        sendMagicLink,
        completeMagicLinkSignIn,
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
