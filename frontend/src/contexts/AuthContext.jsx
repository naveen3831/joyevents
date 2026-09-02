import React, { createContext, useContext, useState, useEffect } from "react";
import { isSessionActive, clearSession } from "@/lib/session";
import { apiGetMe } from "@/lib/api";
// Create context with proper error handling
const AuthContext = createContext(null);
const normalizeRole = (value) => value === "user" ? "customer" : value;
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
            const r = normalizeRole(localStorage.getItem("role"));
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
        setUserState((prev) => {
            if (!u) {
                try {
                    localStorage.removeItem("user");
                } catch (e) {}
                return null;
            }

            const avatarUrl = u.avatar || u.merchantDetails?.avatar || prev?.avatar || prev?.merchantDetails?.avatar || "";
            const normalizedUser = {
                ...prev,
                ...u,
                role: normalizeRole(u.role || prev?.role),
                avatar: avatarUrl,
                merchantDetails: u.merchantDetails ? {
                    ...prev?.merchantDetails,
                    ...u.merchantDetails,
                    avatar: avatarUrl,
                } : (prev?.merchantDetails ? {
                    ...prev.merchantDetails,
                    avatar: avatarUrl,
                } : undefined),
            };

            try {
                localStorage.setItem("user", JSON.stringify(normalizedUser));
            } catch (error) {
                console.warn('Failed to update user in localStorage:', error);
            }
            return normalizedUser;
        });
    };

    // Hydrate user profile from API on mount / token change
    useEffect(() => {
        if (!token) return;
        let isMounted = true;

        apiGetMe(token)
            .then((freshUser) => {
                if (isMounted && freshUser) {
                    setUser(freshUser);
                }
            })
            .catch((err) => {
                console.warn("Failed to hydrate user profile:", err);
            });

        return () => {
            isMounted = false;
        };
    }, [token]);
    const setRole = (r) => {
        const normalizedRole = normalizeRole(r);
        setRoleState(normalizedRole);
        try {
            localStorage.setItem("role", normalizedRole);
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
        const normalizedUser = updatedUser ? { ...updatedUser, role: normalizeRole(updatedUser.role) } : updatedUser;
        setUser(normalizedUser);
        setRole(normalizedUser?.role || "customer");
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
