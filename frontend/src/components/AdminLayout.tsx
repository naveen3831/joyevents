import { ReactNode, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AdminSidebar from "./AdminSidebar";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Navbar hideDashboardLinks={true} onSidebarToggle={() => setSidebarOpen(o => !o)} />
      <div className="flex flex-1 w-full pt-16">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 w-full overflow-auto min-w-0 px-2 sm:px-8 lg:px-14 xl:px-20">{children}</main>
      </div>
      <Footer />
    </div>
  );
};

export default AdminLayout;
