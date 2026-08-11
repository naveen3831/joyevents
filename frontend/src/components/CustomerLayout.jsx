import { useState } from "react";
import Navbar from "./Navbar";
import CustomerSidebar from "./CustomerSidebar";
import MobileBottomNav from "./MobileBottomNav";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CustomerLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (<div className="min-h-screen w-full flex flex-col pb-20 md:pb-0 relative">
      <Navbar hideDashboardLinks={true} onSidebarToggle={() => setSidebarOpen(o => !o)} sidebarOpen={sidebarOpen}/>
      <div className="flex flex-1 w-full pt-20">
        <CustomerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen(o => !o)}/>
        <main className="flex-1 w-full overflow-auto min-w-0 px-2 sm:px-8 lg:px-14 xl:px-20 pb-24 md:pb-8">{children}</main>
      </div>

      {/* Floating AI Picks Button — Bottom Right on Mobile */}
      <Link
        to="/customer-dashboard/ai-recommendations"
        className="fixed bottom-24 right-4 z-40 md:hidden flex items-center gap-2 bg-gradient-primary text-white px-3.5 py-2.5 rounded-full shadow-glow shadow-primary/40 border border-white/20 active:scale-95 transition-all"
        title="AI Picks Recommendations"
      >
        <Sparkles className="h-4 w-4 animate-pulse" />
        <span className="text-xs font-bold tracking-wide">AI Picks</span>
      </Link>

      <MobileBottomNav />
    </div>);
};
export default CustomerLayout;
