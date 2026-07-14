import React, { createContext, useContext, useState } from "react";
import { isSessionActive, clearSession } from "@/lib/session";
// Create context with proper error handling
const AuthContext = createContext(null);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
export const AuthProvider = ({ children }) => {
    const [token, setTokenState] = useState(() => {
        try {
            return localStorage.getItem("token");
        }
        catch {
            return null;
        }
    });
    const [user, setUserState] = useState(() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        }
        catch {
            return null;
        }
    });
    const [role, setRoleState] = useState(() => {
        try {
            const r = localStorage.getItem("role");
            return r === "customer" || r === "merchant" || r === "admin" ? r : "customer";
        }
        catch {
            return "customer";
        }
    });
    const [isLoggedIn, setIsLoggedInState] = useState(() => {
        try {
            return !!localStorage.getItem("token") && !!localStorage.getItem("user") && isSessionActive();
        }
        catch {
            return false;
        }
    });
    const setToken = (t) => {
        setTokenState(t);
        try {
            if (t)
                localStorage.setItem("token", t);
            else
                localStorage.removeItem("token");
        }
        catch (error) {
            console.warn('Failed to update token in localStorage:', error);
        }
    };
    const setUser = (u) => {
        setUserState(u);
        try {
            if (u)
                localStorage.setItem("user", JSON.stringify(u));
            else
                localStorage.removeItem("user");
        }
        catch (error) {
            console.warn('Failed to update user in localStorage:', error);
        }
    };
    const setRole = (r) => {
        setRoleState(r);
        try {
            localStorage.setItem("role", r);
        }
        catch (error) {
            console.warn('Failed to update role in localStorage:', error);
        }
    };
    const setIsLoggedIn = (v) => {
        setIsLoggedInState(v);
        if (!v) {
            try {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("role");
                clearSession();
            }
            catch (error) {
                console.warn('Failed to clear localStorage:', error);
            }
            setTokenState(null);
            setUserState(null);
            setRoleState("customer");
        }
    };
    const updateUser = (updatedUser) => {
        setUser(updatedUser);
        setRole(updatedUser.role);
    };
    const contextValue = {
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
    return (<AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>);
};
