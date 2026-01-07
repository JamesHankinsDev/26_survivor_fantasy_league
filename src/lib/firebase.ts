import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Firebase configuration - only initialize if we have all required values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let app: any;
let auth: any;
let db: any;
let googleProvider: any;

// Only initialize Firebase on the client side
if (typeof window !== "undefined") {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  db = getFirestore(app);

  //   // Enable emulators in development (optional)
  //   if (process.env.NODE_ENV === "development") {
  //     // Auth emulator
  //     if (!auth.emulatorConfig) {
  //       try {
  //         connectAuthEmulator(auth, "http://localhost:9099", {
  //           disableWarnings: true,
  //         });
  //       } catch (error) {
  //         // Emulator already enabled
  //       }
  //     }

  //     // Firestore emulator
  //     try {
  //       connectFirestoreEmulator(db, "localhost", 8080);
  //     } catch (error) {
  //       // Emulator already enabled or error connecting
  //     }
  //   }
}

export { auth, googleProvider, db };
export default app;
