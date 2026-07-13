import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen w-full flex flex-col">
    <Navbar />
    <main className="flex-1 w-full pt-20">{children}</main>
    <Footer />
  </div>
);

export default Layout;
