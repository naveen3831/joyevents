import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardPaths } from "@/lib/auth";
import { isSessionActive } from "@/lib/session";

const normalizeRole = (value) => value === "user" ? "customer" : value;

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isLoggedIn, role, token, user } = useAuth();
    const location = useLocation();
    const normalizedRole = normalizeRole(role);

    const checkAuth = () => {
        const savedToken = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");
        const savedRole = localStorage.getItem("role");
        if (!savedToken || !savedUser || !savedRole) {
            return false;
        }
        try {
            JSON.parse(savedUser);
            return true;
        }
        catch {
            return false;
        }
    };

    const isAuthenticated = isLoggedIn && isSessionActive() && token && user && checkAuth();
    const hasValidStorage = checkAuth();
    const effectivelyAuthenticated = isAuthenticated || (hasValidStorage && token && user && isLoggedIn);

    if (!effectivelyAuthenticated) {
        if (sessionStorage.getItem("forceLoginNoRedirect") === "1") {
            sessionStorage.removeItem("forceLoginNoRedirect");
            localStorage.removeItem("authReturnTo");
            return <Navigate to="/login" replace/>;
        }
        const returnTo = location.pathname + location.search;
        localStorage.setItem("authReturnTo", returnTo);
        return <Navigate to={`/login?redirect=${encodeURIComponent(returnTo)}`} replace/>;
    }

    if (!allowedRoles.includes(normalizedRole)) {
        return <Navigate to={dashboardPaths[normalizedRole] || "/login"} replace/>;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
