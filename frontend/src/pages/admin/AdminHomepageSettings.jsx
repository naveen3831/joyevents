import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import {
  Save,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Users,
  Briefcase,
  Activity,
  Phone,
  Image as ImageIcon,
  Mail,
  MapPin,
  Clock,
  Layers,
  Info,
} from "lucide-react";
import { apiGetHomepageSettings, apiSaveHomepageSettings } from "@/lib/api";

const SECTIONS = [
  { id: "hero", label: "Hero & Header", icon: Sparkles },
  { id: "about", label: "About Us Page", icon: Users },
  { id: "portfolio", label: "Portfolio Page", icon: Briefcase },
  { id: "metrics", label: "Stats & Metrics", icon: Activity },
  { id: "contact", label: "Contact & Footer", icon: Phone },
  { id: "images", label: "Banner Images", icon: ImageIcon },
];

const AdminHomepageSettings = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  // Form States
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [eventsCount, setEventsCount] = useState("");
  const [attendeesCount, setAttendeesCount] = useState("");
  const [merchantsCount, setMerchantsCount] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactWorkingHours, setContactWorkingHours] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutSubtitle, setAboutSubtitle] = useState("");
  const [aboutExperience, setAboutExperience] = useState("");
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioSubtitle, setPortfolioSubtitle] = useState("");
  const [portfolioCategories, setPortfolioCategories] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [eventsImage, setEventsImage] = useState("");
  const [servicesImage, setServicesImage] = useState("");
  const [aboutImage, setAboutImage] = useState("");
  const [portfolioImage, setPortfolioImage] = useState("");
  const [contactImage, setContactImage] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await apiGetHomepageSettings();
      if (data) {
        setHeroTitle(data.heroTitle || "");
        setHeroSubtitle(data.heroSubtitle || "");
        setEventsCount(data.eventsCount || "");
        setAttendeesCount(data.attendeesCount || "");
        setMerchantsCount(data.merchantsCount || "");
        setContactPhone(data.contactPhone || "");
        setContactEmail(data.contactEmail || "");
        setContactAddress(data.contactAddress || "");
        setContactWorkingHours(data.contactWorkingHours || "");
        setAboutTitle(data.aboutTitle || "");
        setAboutSubtitle(data.aboutSubtitle || "");
        setAboutExperience(data.aboutExperience || "");
        setPortfolioTitle(data.portfolioTitle || "");
        setPortfolioSubtitle(data.portfolioSubtitle || "");
        setPortfolioCategories(data.portfolioCategories || "");
        setHeroImage(data.heroImage || "");
        setEventsImage(data.eventsImage || "");
        setServicesImage(data.servicesImage || "");
        setAboutImage(data.aboutImage || "");
        setPortfolioImage(data.portfolioImage || "");
        setContactImage(data.contactImage || "");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load homepage settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (!heroTitle.trim() || !heroSubtitle.trim()) {
      toast.error("Hero Title and Subtitle are required");
      setActiveSection("hero");
      return;
    }
    if (!aboutTitle.trim() || !aboutSubtitle.trim()) {
      toast.error("About Us Title and Subtitle are required");
      setActiveSection("about");
      return;
    }
    if (!portfolioTitle.trim() || !portfolioSubtitle.trim()) {
      toast.error("Portfolio Title and Subtitle are required");
      setActiveSection("portfolio");
      return;
    }

    if (contactPhone.trim()) {
      const phoneRegex = /^[0-9]{12}$/;
      if (!phoneRegex.test(contactPhone.trim())) {
        toast.error(
          "Invalid Phone Number. Must contain exactly 12 numeric digits (no letters, spaces, or special characters)."
        );
        setActiveSection("contact");
        return;
      }
    }

    if (contactEmail.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(contactEmail.trim())) {
        toast.error("Invalid Support Email. Please enter a valid email address.");
        setActiveSection("contact");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        heroTitle,
        heroSubtitle,
        eventsCount,
        attendeesCount,
        merchantsCount,
        contactPhone,
        contactEmail,
        contactAddress,
        contactWorkingHours,
        aboutTitle,
        aboutSubtitle,
        aboutExperience,
        portfolioTitle,
        portfolioSubtitle,
        portfolioCategories,
        heroImage,
        eventsImage,
        servicesImage,
        aboutImage,
        portfolioImage,
        contactImage,
      };

      await apiSaveHomepageSettings(payload, token);
      localStorage.setItem("homepageSettings", JSON.stringify(payload));
      window.dispatchEvent(new Event("homepage-settings-updated"));
      toast.success("Homepage CMS settings updated successfully!");
    } catch (err) {
      toast.error(err?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-[1280px] mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Homepage CMS"
          subtitle="Manage the content displayed on the public homepage."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "Growth" },
            { label: "Homepage CMS" },
          ]}
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open("/", "_blank")}
                className="h-9 text-xs font-semibold gap-1.5 rounded-lg border-border/80"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Preview Homepage
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={loadSettings}
                disabled={loading}
                className="h-9 text-xs font-semibold gap-1.5 rounded-lg border-border/80"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-xs gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Loading CMS configuration...
          </div>
        ) : (
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar Section Navigation (3 Cols) */}
            <div className="lg:col-span-3 space-y-3">
              <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-2">
                  Homepage Sections
                </p>

                <nav className="space-y-1">
                  {SECTIONS.map((sec) => {
                    const Icon = sec.icon;
                    const isActive = activeSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setActiveSection(sec.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left ${
                          isActive
                            ? "bg-primary/10 text-primary border-l-2 border-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="truncate">{sec.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Info Card (Information Only) */}
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-3.5 space-y-1.5 hidden lg:block">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Make your edits across sections and save when ready. Changes will be live immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Content Editor Workspace (9 Cols) */}
            <div className="lg:col-span-9 space-y-6">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-6"
              >
                {/* 1. Hero & Header */}
                {activeSection === "hero" && (
                  <div className="space-y-5">
                    <div className="pb-3 border-b border-border/70 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" /> Hero & Header Content
                      </h2>
                      <span className="text-[11px] text-muted-foreground font-medium">Main landing banner text</span>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="heroTitle" className="text-xs font-semibold">
                            Hero Title *
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {heroTitle.length}/100
                          </span>
                        </div>
                        <Input
                          id="heroTitle"
                          required
                          maxLength={100}
                          value={heroTitle}
                          onChange={(e) => setHeroTitle(e.target.value)}
                          placeholder="e.g. Create Unforgettable Moments"
                          className="h-9 text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          The middle word will be styled with a vibrant gradient accent.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="heroSubtitle" className="text-xs font-semibold">
                            Hero Subtitle / Description *
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {heroSubtitle.length}/500
                          </span>
                        </div>
                        <Textarea
                          id="heroSubtitle"
                          required
                          maxLength={500}
                          rows={3}
                          value={heroSubtitle}
                          onChange={(e) => setHeroSubtitle(e.target.value)}
                          placeholder="From intimate workshops to grand festivals..."
                          className="text-xs min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. About Us */}
                {activeSection === "about" && (
                  <div className="space-y-5">
                    <div className="pb-3 border-b border-border/70 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" /> About Us Page Content
                      </h2>
                      <span className="text-[11px] text-muted-foreground font-medium">Company mission & background</span>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="aboutTitle" className="text-xs font-semibold">
                              About Us Title *
                            </Label>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {aboutTitle.length}/100
                            </span>
                          </div>
                          <Input
                            id="aboutTitle"
                            required
                            maxLength={100}
                            value={aboutTitle}
                            onChange={(e) => setAboutTitle(e.target.value)}
                            placeholder="e.g. We build unforgettable event experiences"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="aboutExperience" className="text-xs font-semibold">
                              Years of Experience
                            </Label>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {aboutExperience.length}/20
                            </span>
                          </div>
                          <Input
                            id="aboutExperience"
                            maxLength={20}
                            value={aboutExperience}
                            onChange={(e) => setAboutExperience(e.target.value)}
                            placeholder="e.g. 12+"
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="aboutSubtitle" className="text-xs font-semibold">
                            About Us Description *
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {aboutSubtitle.length}/500
                          </span>
                        </div>
                        <Textarea
                          id="aboutSubtitle"
                          required
                          maxLength={500}
                          rows={3}
                          value={aboutSubtitle}
                          onChange={(e) => setAboutSubtitle(e.target.value)}
                          placeholder="Describe the company mission and goals..."
                          className="text-xs min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Portfolio Page */}
                {activeSection === "portfolio" && (
                  <div className="space-y-5">
                    <div className="pb-3 border-b border-border/70 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" /> Portfolio Section Content
                      </h2>
                      <span className="text-[11px] text-muted-foreground font-medium">Platform showcase heading</span>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="portfolioTitle" className="text-xs font-semibold">
                              Portfolio Title *
                            </Label>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {portfolioTitle.length}/100
                            </span>
                          </div>
                          <Input
                            id="portfolioTitle"
                            required
                            maxLength={100}
                            value={portfolioTitle}
                            onChange={(e) => setPortfolioTitle(e.target.value)}
                            placeholder="e.g. A portfolio shaped by atmosphere and scale"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="portfolioCategories" className="text-xs font-semibold">
                            Event Categories Metric
                          </Label>
                          <Input
                            id="portfolioCategories"
                            maxLength={5}
                            value={portfolioCategories}
                            onChange={(e) => setPortfolioCategories(e.target.value)}
                            placeholder="e.g. 12+"
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="portfolioSubtitle" className="text-xs font-semibold">
                            Portfolio Subtitle / Description *
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {portfolioSubtitle.length}/500
                          </span>
                        </div>
                        <Textarea
                          id="portfolioSubtitle"
                          required
                          maxLength={500}
                          rows={3}
                          value={portfolioSubtitle}
                          onChange={(e) => setPortfolioSubtitle(e.target.value)}
                          placeholder="Describe the portfolio summary..."
                          className="text-xs min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Stats & Metrics */}
                {activeSection === "metrics" && (
                  <div className="space-y-5">
                    <div className="pb-3 border-b border-border/70 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" /> Platform Stats & Metrics
                      </h2>
                      <span className="text-[11px] text-muted-foreground font-medium">Public homepage counters</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="eventsCount" className="text-xs font-semibold">
                          Events Count
                        </Label>
                        <Input
                          id="eventsCount"
                          maxLength={5}
                          value={eventsCount}
                          onChange={(e) => setEventsCount(e.target.value)}
                          placeholder="e.g. 1,800"
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="attendeesCount" className="text-xs font-semibold">
                          Attendees Count
                        </Label>
                        <Input
                          id="attendeesCount"
                          maxLength={5}
                          value={attendeesCount}
                          onChange={(e) => setAttendeesCount(e.target.value)}
                          placeholder="e.g. 50K+"
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="merchantsCount" className="text-xs font-semibold">
                          Merchants Count
                        </Label>
                        <Input
                          id="merchantsCount"
                          maxLength={5}
                          value={merchantsCount}
                          onChange={(e) => setMerchantsCount(e.target.value)}
                          placeholder="e.g. 340+"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Contact & Footer */}
                {activeSection === "contact" && (
                  <div className="space-y-5">
                    <div className="pb-3 border-b border-border/70 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" /> Contact & Footer Details
                      </h2>
                      <span className="text-[11px] text-muted-foreground font-medium">Support info displayed in footer</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="contactPhone" className="text-xs font-semibold flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number (12 digits)
                        </Label>
                        <Input
                          id="contactPhone"
                          maxLength={12}
                          value={contactPhone}
                          onChange={(e) =>
                            setContactPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))
                          }
                          placeholder="e.g. 919876543210"
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="contactEmail" className="text-xs font-semibold flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Support Email
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {contactEmail.length}/50
                          </span>
                        </div>
                        <Input
                          id="contactEmail"
                          type="email"
                          maxLength={50}
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="e.g. info@eventoza.com"
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="contactAddress" className="text-xs font-semibold flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Office Location
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {contactAddress.length}/150
                          </span>
                        </div>
                        <Input
                          id="contactAddress"
                          maxLength={150}
                          value={contactAddress}
                          onChange={(e) => setContactAddress(e.target.value)}
                          placeholder="e.g. Mumbai, India"
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="contactWorkingHours" className="text-xs font-semibold flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Business Hours
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {contactWorkingHours.length}/100
                          </span>
                        </div>
                        <Input
                          id="contactWorkingHours"
                          maxLength={100}
                          value={contactWorkingHours}
                          onChange={(e) => setContactWorkingHours(e.target.value)}
                          placeholder="e.g. Mon–Fri, 9am–6pm IST"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Banner & Illustration Images */}
                {activeSection === "images" && (
                  <div className="space-y-5">
                    <div className="pb-3 border-b border-border/70 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" /> Banner & Illustration Images
                      </h2>
                      <span className="text-[11px] text-muted-foreground font-medium">Public landing page visual assets</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="heroImage" className="text-xs font-semibold">
                            Home Hero Image URL
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">{heroImage.length}/500</span>
                        </div>
                        <Input
                          id="heroImage"
                          maxLength={500}
                          value={heroImage}
                          onChange={(e) => setHeroImage(e.target.value)}
                          placeholder="Enter hero image URL..."
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="eventsImage" className="text-xs font-semibold">
                            Events Banner Image URL
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">{eventsImage.length}/500</span>
                        </div>
                        <Input
                          id="eventsImage"
                          maxLength={500}
                          value={eventsImage}
                          onChange={(e) => setEventsImage(e.target.value)}
                          placeholder="Enter events banner URL..."
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="servicesImage" className="text-xs font-semibold">
                            Services Banner Image URL
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">{servicesImage.length}/500</span>
                        </div>
                        <Input
                          id="servicesImage"
                          maxLength={500}
                          value={servicesImage}
                          onChange={(e) => setServicesImage(e.target.value)}
                          placeholder="Enter services banner URL..."
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="aboutImage" className="text-xs font-semibold">
                            About Us Illustration URL
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">{aboutImage.length}/500</span>
                        </div>
                        <Input
                          id="aboutImage"
                          maxLength={500}
                          value={aboutImage}
                          onChange={(e) => setAboutImage(e.target.value)}
                          placeholder="Enter illustration URL..."
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="portfolioImage" className="text-xs font-semibold">
                            Portfolio Illustration URL
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">{portfolioImage.length}/500</span>
                        </div>
                        <Input
                          id="portfolioImage"
                          maxLength={500}
                          value={portfolioImage}
                          onChange={(e) => setPortfolioImage(e.target.value)}
                          placeholder="Enter portfolio URL..."
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="contactImage" className="text-xs font-semibold">
                            Contact Us Illustration URL
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">{contactImage.length}/500</span>
                        </div>
                        <Input
                          id="contactImage"
                          maxLength={500}
                          value={contactImage}
                          onChange={(e) => setContactImage(e.target.value)}
                          placeholder="Enter contact illustration URL..."
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Save Action */}
                <div className="pt-4 border-t border-border/60 flex items-center justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-10 px-6 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-2 cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving Changes..." : "Save Configuration"}
                  </Button>
                </div>
              </motion.div>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminHomepageSettings;
