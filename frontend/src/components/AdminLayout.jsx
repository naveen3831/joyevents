import { useState } from "react";
import Navbar from "./Navbar";
import AdminSidebar from "./AdminSidebar";
const AdminLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (<div className="min-h-screen w-full flex flex-col">
      <Navbar hideDashboardLinks={true} onSidebarToggle={() => setSidebarOpen(o => !o)}/>
      <div className="flex flex-1 w-full pt-20">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen(o => !o)}/>
        <main className="flex-1 w-full overflow-auto min-w-0 px-2 sm:px-8 lg:px-14 xl:px-20">{children}</main>
      </div>
    </div>);
};
export default AdminLayout;
