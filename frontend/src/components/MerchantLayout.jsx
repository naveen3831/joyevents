import { useState, useEffect } from "react";
import MerchantTopHeader from "./MerchantTopHeader";
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

  // Lock document body overflow inside the Merchant Portal dashboard shell
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalDocHeight = document.documentElement.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100vh";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      document.documentElement.style.overflow = originalDocOverflow;
      document.documentElement.style.height = originalDocHeight;
    };
  }, []);

  if (user && !isMerchantActive && !allowedPaths.includes(location.pathname)) {
    return <Navigate to="/merchant-dashboard" replace />;
  }

  return (
    <div className="fixed inset-0 h-screen w-screen flex overflow-hidden bg-background text-foreground font-sans antialiased overscroll-contain">
      {/* Fixed Desktop Sidebar */}
      <MerchantSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Container Area (Header + Main Content) */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        {/* Top Header - Fixed at top with h-14 */}
        <MerchantTopHeader onSidebarToggle={() => setSidebarOpen((o) => !o)} />

        {/* Independently Scrollable Main Content Area with standardized Admin spacing */}
        <main className="flex-1 w-full h-full min-h-0 overflow-y-auto overscroll-contain min-w-0 px-4 sm:px-6 lg:px-8 py-5 pb-16">
          <div className="w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MerchantLayout;
