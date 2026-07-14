import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardPaths } from "@/lib/auth";
const PublicRoute = ({ children }) => {
    const { isLoggedIn, role } = useAuth();
    if (isLoggedIn && role) {
        return <Navigate to={dashboardPaths[role]} replace/>;
    }
    return <>{children}</>;
};
export default PublicRoute;
