import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";

const Layout = ({ children }) => {
    return (<div className="min-h-screen flex flex-col bg-background text-foreground pb-16 md:pb-0">
      <Navbar />
      <main className="flex-1 pt-20 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>);
};
export default Layout;
