import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = localStorage.getItem("studySphere_user");
        const savedToken = localStorage.getItem("studySphere_token");

        if (savedUser && savedToken) {
          // Verify token is still valid by making a profile request
          const response = await ApiService.getProfile();
          setUser(response.user);
        }
      } catch (error) {
        // Token is invalid, clear stored data
        console.error("Auth initialization error:", error);
        localStorage.removeItem("studySphere_user");
        localStorage.removeItem("studySphere_token");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await ApiService.login(email, password);
      setUser(response.user);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
      // Re-throw the error so components can handle it properly
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
      const response = await ApiService.register(name, email, password);
      setUser(response.user);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Signup error:", error);
      setIsLoading(false);
      // Re-throw the error so components can handle it properly
      throw error;
    }
  };

  const logout = () => {
    ApiService.logout();
    setUser(null);

    // Import toast dynamically to avoid circular dependencies
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
