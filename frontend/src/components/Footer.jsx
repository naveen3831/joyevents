import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatformName } from "@/hooks/usePlatformName";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import Logo from "@/components/Logo";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/MotionSystem";

const Footer = () => {
    const platformName = usePlatformName();
    const settings = useHomepageSettings();
    return (
      <footer className="border-t border-border bg-secondary/50 py-6 sm:py-12 w-full overflow-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-14 xl:px-20">
          <StaggerGroup stagger={0.08} className="w-full">
            {/* Brand row */}
            <StaggerItem>
              <div className="mb-4 sm:mb-8 flex items-center gap-2">
                <Logo className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 transition-transform duration-300 hover:scale-105"/>
                <span className="font-display text-base sm:text-lg font-bold">{platformName}</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-8 sm:max-w-xs">
                Your premier destination for discovering and managing extraordinary events.
              </p>
            </StaggerItem>

            {/* Links — 3 columns on mobile, 4 on md+ */}
            <div className="grid grid-cols-3 gap-3 sm:gap-8 md:grid-cols-3 lg:grid-cols-3">
              <StaggerItem>
                <h4 className="mb-2 sm:mb-3 font-display text-xs sm:text-sm font-semibold">Quick Links</h4>
                <div className="flex flex-col gap-1 sm:gap-2">
                  <Link to="/about" className="text-[11px] sm:text-sm text-muted-foreground transition-all duration-200 hover:text-primary hover:translate-x-1 inline-block">About Us</Link>
                  <Link to="/services" className="text-[11px] sm:text-sm text-muted-foreground transition-all duration-200 hover:text-primary hover:translate-x-1 inline-block">Our Services</Link>
                  <Link to="/portfolio" className="text-[11px] sm:text-sm text-muted-foreground transition-all duration-200 hover:text-primary hover:translate-x-1 inline-block">Our Portfolio</Link>
                  <Link to="/contact" className="text-[11px] sm:text-sm text-muted-foreground transition-all duration-200 hover:text-primary hover:translate-x-1 inline-block">Contact Us</Link>
                </div>
              </StaggerItem>
              <StaggerItem>
                <h4 className="mb-2 sm:mb-3 font-display text-xs sm:text-sm font-semibold">Explore</h4>
                <div className="flex flex-col gap-1 sm:gap-2">
                  <Link to="/events" className="text-[11px] sm:text-sm text-muted-foreground transition-all duration-200 hover:text-primary hover:translate-x-1 inline-block">Browse Events</Link>
                  <Link to="/blog" className="text-[11px] sm:text-sm text-muted-foreground transition-all duration-200 hover:text-primary hover:translate-x-1 inline-block">Blog</Link>
                  <Link to="/login" className="text-[11px] sm:text-sm text-muted-foreground transition-all duration-200 hover:text-primary hover:translate-x-1 inline-block">Sign In</Link>
                  <Link to="/merchant-dashboard" className="text-[11px] sm:text-sm text-muted-foreground transition-all duration-200 hover:text-primary hover:translate-x-1 inline-block">Merchant</Link>
                </div>
              </StaggerItem>
              <StaggerItem>
                <h4 className="mb-2 sm:mb-3 font-display text-xs sm:text-sm font-semibold">Contact</h4>
                <div className="flex flex-col gap-1 sm:gap-2 text-[11px] sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Mail className="h-3 w-3 shrink-0 text-primary"/> <span className="truncate">{settings.contactEmail}</span></span>
                  <span className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Phone className="h-3 w-3 shrink-0 text-primary"/> {settings.contactPhone}</span>
                  <span className="flex items-center gap-1.5 hover:text-foreground transition-colors"><MapPin className="h-3 w-3 shrink-0 text-primary"/> {settings.contactAddress}</span>
                </div>
              </StaggerItem>
            </div>
          </StaggerGroup>

          <Reveal delay={0.2}>
            <div className="mt-4 sm:mt-8 border-t border-border pt-4 sm:pt-6 text-center text-xs sm:text-sm text-muted-foreground">
              © 2026 {platformName}. All rights reserved.
            </div>
          </Reveal>
        </div>
      </footer>
    );
};

export default Footer;
