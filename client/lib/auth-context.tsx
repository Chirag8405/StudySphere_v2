import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";
import { ApiService, User } from "./api";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

/** Convert Firebase user → app User shape */
function firebaseUserToUser(fbUser: FirebaseUser): User {
  return {
    id: fbUser.uid,
    name: fbUser.displayName ?? "",
    email: fbUser.email ?? "",
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Store the ID token so ApiService can attach it to requests
        const idToken = await fbUser.getIdToken();
        localStorage.setItem("studySphere_token", idToken);

        setUser(firebaseUserToUser(fbUser));
      } else {
        localStorage.removeItem("studySphere_token");
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Refresh the ID token periodically (Firebase tokens expire after 1 hour)
  useEffect(() => {
    const interval = setInterval(async () => {
      const fbUser = auth.currentUser;
      if (fbUser) {
        const idToken = await fbUser.getIdToken(true);
        localStorage.setItem("studySphere_token", idToken);
      }
    }, 50 * 60 * 1000); // every 50 minutes

    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      localStorage.setItem("studySphere_token", idToken);
      setUser(firebaseUserToUser(credential.user));
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Login error:", error);
      setIsLoading(false);
      // Translate Firebase error codes to user-friendly messages
      const code = error?.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        throw new Error("Invalid email or password");
      }
      if (code === "auth/too-many-requests") {
        throw new Error("Too many login attempts. Please try again later.");
      }
      throw error;
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      // Set displayName on the Firebase Auth user
      await updateProfile(credential.user, { displayName: name });

      // Store the ID token so the registerProfile request can authenticate
      const idToken = await credential.user.getIdToken();
      localStorage.setItem("studySphere_token", idToken);

      // Ask the server to create the Firestore profile
      await ApiService.registerProfile(name, email);
      setUser({
        id: credential.user.uid,
        name,
        email,
      });
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error("Signup error:", error);
      setIsLoading(false);
      const code = error?.code;
      if (code === "auth/email-already-in-use") {
        throw new Error("User with this email already exists");
      }
      if (code === "auth/weak-password") {
        throw new Error("Password is too weak. Use at least 6 characters.");
      }
      throw error;
    }
  };

  const logout = () => {
    signOut(auth);
    localStorage.removeItem("studySphere_token");
    setUser(null);

    import("sonner").then(({ toast }) => {
      toast.info("Logged Out", {
        description: "You have been successfully logged out",
        icon: React.createElement("div", {
          className: "h-4 w-4 rounded-full bg-blue-500",
        }),
      });
    });
  };

  const value: AuthContextType = {
    user,
    login,
    signup,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
