import { useState } from "react";
import Navbar from "./Navbar";
import MerchantSidebar from "./MerchantSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Navigate } from "react-router-dom";
const MerchantLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();
    const location = useLocation();
    const isMerchantActive = !user || user.merchantStatus === "active";
    const allowedPaths = [
        "/merchant-dashboard",
        "/merchant-dashboard/profile",
        "/merchant-dashboard/settings"
    ];
    if (user && !isMerchantActive && !allowedPaths.includes(location.pathname)) {
        return <Navigate to="/merchant-dashboard" replace/>;
    }
    return (<div className="min-h-screen w-full flex flex-col">
      <Navbar hideDashboardLinks={true} onSidebarToggle={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen}/>
      <div className="flex flex-1 w-full pt-20">
        <MerchantSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen(o => !o)}/>
        <main className="flex-1 w-full overflow-auto min-w-0 px-2 sm:px-8 lg:px-14 xl:px-20">{children}</main>
      </div>
    </div>);
};
export default MerchantLayout;
