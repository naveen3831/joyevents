import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatformName } from "@/hooks/usePlatformName";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import Logo from "@/components/Logo";
const Footer = () => {
    const platformName = usePlatformName();
    const settings = useHomepageSettings();
    return (<footer className="border-t border-border bg-secondary/50 py-6 sm:py-12 w-full">
    <div className="w-full px-4 sm:px-6 lg:px-14 xl:px-20">

      {/* Brand row — full width on mobile */}
      <div className="mb-4 sm:mb-8 flex items-center gap-2">
        <Logo className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"/>
        <span className="font-display text-base sm:text-lg font-bold">{platformName}</span>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-8 sm:max-w-xs">
        Your premier destination for discovering and managing extraordinary events.
      </p>

      {/* Links — 3 columns on mobile, 4 on md+ */}
      <div className="grid grid-cols-3 gap-3 sm:gap-8 md:grid-cols-3 lg:grid-cols-3">
        <div>
          <h4 className="mb-2 sm:mb-3 font-display text-xs sm:text-sm font-semibold">Quick Links</h4>
          <div className="flex flex-col gap-1 sm:gap-2">
            <Link to="/about" className="text-[11px] sm:text-sm text-muted-foreground transition-colors hover:text-primary">About Us</Link>
            <Link to="/services" className="text-[11px] sm:text-sm text-muted-foreground transition-colors hover:text-primary">Our Services</Link>
            <Link to="/portfolio" className="text-[11px] sm:text-sm text-muted-foreground transition-colors hover:text-primary">Our Portfolio</Link>
            <Link to="/contact" className="text-[11px] sm:text-sm text-muted-foreground transition-colors hover:text-primary">Contact Us</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-2 sm:mb-3 font-display text-xs sm:text-sm font-semibold">Explore</h4>
          <div className="flex flex-col gap-1 sm:gap-2">
            <Link to="/events" className="text-[11px] sm:text-sm text-muted-foreground transition-colors hover:text-primary">Browse Events</Link>
            <Link to="/blog" className="text-[11px] sm:text-sm text-muted-foreground transition-colors hover:text-primary">Blog</Link>
            <Link to="/login" className="text-[11px] sm:text-sm text-muted-foreground transition-colors hover:text-primary">Sign In</Link>
            <Link to="/merchant-dashboard" className="text-[11px] sm:text-sm text-muted-foreground transition-colors hover:text-primary">Merchant</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-2 sm:mb-3 font-display text-xs sm:text-sm font-semibold">Contact</h4>
          <div className="flex flex-col gap-1 sm:gap-2 text-[11px] sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0"/> <span className="truncate">{settings.contactEmail}</span></span>
            <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0"/> {settings.contactPhone}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0"/> {settings.contactAddress}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 sm:mt-8 border-t border-border pt-4 sm:pt-6 text-center text-xs sm:text-sm text-muted-foreground">
        © 2026 {platformName}. All rights reserved.
      </div>
    </div>
  </footer>);
};
export default Footer;
