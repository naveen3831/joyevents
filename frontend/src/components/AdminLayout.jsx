import { useState, useEffect } from "react";
import AdminTopHeader from "./AdminTopHeader";
import AdminSidebar from "./AdminSidebar";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Prevent browser window/body document scrolling while inside the Admin Portal shell
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

  return (
    <div className="fixed inset-0 h-screen w-screen flex overflow-hidden bg-background text-foreground font-sans antialiased overscroll-contain">
      {/* Fixed Desktop Sidebar */}
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Container Area (Header + Main Content) */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        {/* Top Header - Fixed at top with h-14 */}
        <AdminTopHeader onSidebarToggle={() => setSidebarOpen((o) => !o)} />

        {/* Independently Scrollable Main Content Area with standardized Referral page spacing */}
        <main className="flex-1 w-full h-full min-h-0 overflow-y-auto overscroll-contain min-w-0 px-4 sm:px-6 lg:px-8 py-5 pb-16">
          <div className="w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
