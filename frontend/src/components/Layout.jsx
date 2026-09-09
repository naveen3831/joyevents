import Navbar from "./Navbar";
import Footer from "./Footer";
import { PageEntrance } from "@/components/motion/MotionSystem";

const Layout = ({ children }) => {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 pt-14 sm:pt-16 lg:pt-20">
          <PageEntrance>{children}</PageEntrance>
        </main>
        <Footer />
      </div>
    );
};

export default Layout;
