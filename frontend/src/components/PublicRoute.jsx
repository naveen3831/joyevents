import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardPaths } from "@/lib/auth";

const PublicRoute = ({ children }) => {
    const { isLoggedIn, role } = useAuth();
    const location = useLocation();

    if (isLoggedIn && role) {
        const searchParams = new URLSearchParams(location.search);
        const redirectParam = searchParams.get("redirect");
        const stateFrom = location.state?.from;
        const savedReturnTo = localStorage.getItem("authReturnTo") || sessionStorage.getItem("postLoginRedirect");

        const rawTarget = redirectParam || stateFrom || savedReturnTo;

        let target = dashboardPaths[role] || "/customer-dashboard";
        if (role === "customer" && rawTarget && typeof rawTarget === "string" && rawTarget.startsWith("/") && !rawTarget.startsWith("//")) {
            target = rawTarget;
        } else if (role !== "customer") {
            if (rawTarget && typeof rawTarget === "string" && rawTarget.startsWith(`/${role}-dashboard`)) {
                target = rawTarget;
            } else {
                target = dashboardPaths[role] || "/customer-dashboard";
            }
        }

        if (savedReturnTo) {
            localStorage.removeItem("authReturnTo");
            sessionStorage.removeItem("postLoginRedirect");
        }

        return <Navigate to={target} replace />;
    }
    return <>{children}</>;
};

export default PublicRoute;
