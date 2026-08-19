import { useState } from "react";
import Navbar from "./Navbar";
import MerchantSidebar from "./MerchantSidebar";
import MobileBottomNav from "./MobileBottomNav";
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
    return (<div className="h-screen w-full flex flex-col overflow-hidden pb-16 md:pb-0">
      <Navbar hideDashboardLinks={true} onSidebarToggle={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen}/>
      <div className="flex flex-1 w-full pt-18 sm:pt-20 overflow-hidden">
        <MerchantSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen(o => !o)}/>
        <main className="flex-1 w-full overflow-y-auto min-w-0 px-4 sm:px-6 lg:px-8 pb-20 md:pb-8">{children}</main>
      </div>
      <MobileBottomNav />
    </div>);
};
export default MerchantLayout;
