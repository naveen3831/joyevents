import React, { createContext, useContext, useState, ReactNode } from "react";
import { isSessionActive, clearSession } from "@/lib/session";

export type UserRole = "customer" | "merchant" | "admin";
type AuthUser = { _id: string; name: string; email: string; role: UserRole; createdAt: string; updatedAt: string };

interface AuthContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  token: string | null;
  setToken: (t: string | null) => void;
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  updateUser: (updatedUser: AuthUser) => void;
  isLoading: boolean;
}

// Create context with proper error handling
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(
    () => {
      try {
        return localStorage.getItem("token");
      } catch {
        return null;
      }
    }
  );
  
  const [user, setUserState] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch { 
      return null; 
    }
  });
  
  const [role, setRoleState] = useState<UserRole>(() => {
    try {
      const r = localStorage.getItem("role") as UserRole | null;
      return r === "customer" || r === "merchant" || r === "admin" ? r : "customer";
    } catch {
      return "customer";
    }
  });
  
  const [isLoggedIn, setIsLoggedInState] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("token") && !!localStorage.getItem("user") && isSessionActive();
    } catch {
      return false;
    }
  });

  const setToken = (t: string | null) => {
    setTokenState(t);
    try {
      if (t) localStorage.setItem("token", t);
      else localStorage.removeItem("token");
    } catch (error) {
      console.warn('Failed to update token in localStorage:', error);
    }
  };

  const setUser = (u: any) => {
    setUserState(u);
    try {
      if (u) localStorage.setItem("user", JSON.stringify(u));
      else localStorage.removeItem("user");
    } catch (error) {
      console.warn('Failed to update user in localStorage:', error);
    }
  };

  const setRole = (r: UserRole) => {
    setRoleState(r);
    try {
      localStorage.setItem("role", r);
    } catch (error) {
      console.warn('Failed to update role in localStorage:', error);
    }
  };

  const setIsLoggedIn = (v: boolean) => {
    setIsLoggedInState(v);
    if (!v) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        clearSession();
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
      setTokenState(null);
      setUserState(null);
      setRoleState("customer");
    }
  };

  const updateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
    setRole(updatedUser.role);
  };

  const contextValue: AuthContextType = {
    role, 
    setRole,
    isLoggedIn, 
    setIsLoggedIn,
    token, 
    setToken,
    user, 
    setUser,
    updateUser,
    isLoading: false,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
