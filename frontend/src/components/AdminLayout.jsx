import { useState } from "react";
import Navbar from "./Navbar";
import AdminSidebar from "./AdminSidebar";
import MobileBottomNav from "./MobileBottomNav";
const AdminLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (<div className="h-screen w-full flex flex-col overflow-hidden pb-16 md:pb-0">
      <Navbar hideDashboardLinks={true} onSidebarToggle={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen}/>
      <div className="flex flex-1 w-full pt-18 sm:pt-20 overflow-hidden">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen(o => !o)}/>
        <main className="flex-1 w-full overflow-y-auto min-w-0 px-4 sm:px-6 lg:px-8 py-5 pb-20 md:pb-8">{children}</main>
      </div>
      <MobileBottomNav />
    </div>);
};
export default AdminLayout;
