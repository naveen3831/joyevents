import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardPaths } from "@/lib/auth";

interface PublicRouteProps {
  children: ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isLoggedIn, role } = useAuth();

  if (isLoggedIn && role) {
    return <Navigate to={dashboardPaths[role]} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
