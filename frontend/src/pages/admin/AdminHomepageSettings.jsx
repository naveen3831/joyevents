import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Save,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Users,
  Briefcase,
  Activity,
  Phone,
  Mail,
  MapPin,
  Clock,
  Info,
  FileText,
} from "lucide-react";
import { apiGetHomepageSettings, apiSaveHomepageSettings } from "@/lib/api";
import { ImageUploadField } from "@/components/common/ImageUploadField";

const SECTIONS = [
  { id: "hero", label: "Hero & Header", icon: Sparkles },
  { id: "about", label: "About Us Page", icon: Users },
  { id: "portfolio", label: "Portfolio Page", icon: Briefcase },
  { id: "metrics", label: "Stats & Metrics", icon: Activity },
  { id: "contact", label: "Contact & Footer", icon: Phone },
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
      toast.success("Homepage configuration saved successfully!");
    } catch (err) {
      toast.error(err?.message || "Failed to save homepage settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <PageHeader
          title="Homepage CMS"
          description="Manage content and visual assets displayed on the public landing pages."
          breadcrumbs={[
            { label: "Admin Portal", href: "/admin-dashboard" },
            { label: "Growth" },
            { label: "Homepage CMS" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/", "_blank")}
                className="h-8 text-xs gap-1.5 border-border/80"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Preview Homepage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSettings}
                disabled={loading}
                className="h-8 text-xs gap-1.5 border-border/80"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Left Sidebar Section Navigation */}
          <div className="md:col-span-1 space-y-3">
            <div className="p-3 rounded-[14px] bg-card border border-border/80 shadow-2xs">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 pb-2 border-b border-border/60">
                Homepage Sections
              </h3>
              <nav className="mt-2 space-y-1">
                {SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setActiveSection(sec.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${
                        isActive
                          ? "bg-primary/10 text-primary shadow-2xs"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-3.5 rounded-[14px] bg-muted/30 border border-border/60 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" /> Tip
              </div>
              <p className="text-[11px] leading-relaxed">
                Edit section text content and upload visual images together. Click Save Changes when done.
              </p>
            </div>
          </div>

          {/* Right Main Settings Form */}
          <div className="md:col-span-3">
            <form onSubmit={handleSave} className="space-y-6">

              {/* 1. Hero & Header */}
              {activeSection === "hero" && (
                <div className="space-y-6">
                  {/* Hero Content Card */}
                  <div className="rounded-[14px] border border-border/80 bg-card p-5 sm:p-6 shadow-2xs space-y-4">
                    <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Hero Content
                      </h3>
                      <span className="text-[11px] text-muted-foreground">
                        Main landing header & subtitle
                      </span>
                    </div>

                    <div className="space-y-4 max-w-3xl">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="heroTitle" className="text-xs font-semibold">
                            Hero Title
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
                          className="h-9 text-xs bg-background"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="heroSubtitle" className="text-xs font-semibold">
                            Hero Subtitle / Description
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
                          className="text-xs min-h-[85px] resize-none bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hero Visual Card */}
                  <ImageUploadField
                    id="heroImage"
                    label="Hero Visual"
                    value={heroImage}
                    onChange={setHeroImage}
                    placeholder="https://images.unsplash.com/photo-..."
                    token={token}
                    aspectRatioClass="aspect-[16/9]"
                    recommendedDimensions="Recommended: 1600 × 900 px"
                  />

                  {/* Events & Services Banner Visual Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <ImageUploadField
                      id="eventsImage"
                      label="Events Banner"
                      value={eventsImage}
                      onChange={setEventsImage}
                      placeholder="https://images.unsplash.com/photo-..."
                      token={token}
                      aspectRatioClass="aspect-[16/7]"
                      recommendedDimensions="Recommended: 1600 × 600 px"
                    />

                    <ImageUploadField
                      id="servicesImage"
                      label="Services Banner"
                      value={servicesImage}
                      onChange={setServicesImage}
                      placeholder="https://images.unsplash.com/photo-..."
                      token={token}
                      aspectRatioClass="aspect-[16/7]"
                      recommendedDimensions="Recommended: 1600 × 600 px"
                    />
                  </div>
                </div>
              )}

              {/* 2. About Us Page */}
              {activeSection === "about" && (
                <div className="space-y-6">
                  {/* About Content Card */}
                  <div className="rounded-[14px] border border-border/80 bg-card p-5 sm:p-6 shadow-2xs space-y-4">
                    <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        About Content
                      </h3>
                      <span className="text-[11px] text-muted-foreground">
                        Company mission and experience heading
                      </span>
                    </div>

                    <div className="space-y-4 max-w-3xl">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="aboutTitle" className="text-xs font-semibold">
                              About Title
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
                            className="h-9 text-xs bg-background"
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
                            className="h-9 text-xs bg-background"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="aboutSubtitle" className="text-xs font-semibold">
                            About Description
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
                          className="text-xs min-h-[85px] resize-none bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* About Visual Card */}
                  <ImageUploadField
                    id="aboutImage"
                    label="About Image"
                    value={aboutImage}
                    onChange={setAboutImage}
                    placeholder="https://images.unsplash.com/photo-..."
                    token={token}
                    aspectRatioClass="aspect-[16/9]"
                    recommendedDimensions="Recommended: 1200 × 900 px"
                  />
                </div>
              )}

              {/* 3. Portfolio Page */}
              {activeSection === "portfolio" && (
                <div className="space-y-6">
                  {/* Portfolio Content Card */}
                  <div className="rounded-[14px] border border-border/80 bg-card p-5 sm:p-6 shadow-2xs space-y-4">
                    <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Portfolio Content
                      </h3>
                      <span className="text-[11px] text-muted-foreground">
                        Portfolio section headline and metrics
                      </span>
                    </div>

                    <div className="space-y-4 max-w-3xl">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="portfolioTitle" className="text-xs font-semibold">
                              Portfolio Title
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
                            className="h-9 text-xs bg-background"
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
                            className="h-9 text-xs bg-background"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="portfolioSubtitle" className="text-xs font-semibold">
                            Portfolio Description
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
                          className="text-xs min-h-[85px] resize-none bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Visual Card */}
                  <ImageUploadField
                    id="portfolioImage"
                    label="Portfolio Image"
                    value={portfolioImage}
                    onChange={setPortfolioImage}
                    placeholder="https://images.unsplash.com/photo-..."
                    token={token}
                    aspectRatioClass="aspect-[16/9]"
                    recommendedDimensions="Recommended: 1200 × 900 px"
                  />
                </div>
              )}

              {/* 4. Stats & Metrics */}
              {activeSection === "metrics" && (
                <div className="rounded-[14px] border border-border/80 bg-card p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Platform Stats & Metrics
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      Public landing page counter numbers
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                    <div className="space-y-1.5">
                      <Label htmlFor="eventsCount" className="text-xs font-semibold">
                        Events Count
                      </Label>
                      <Input
                        id="eventsCount"
                        maxLength={10}
                        value={eventsCount}
                        onChange={(e) => setEventsCount(e.target.value)}
                        placeholder="e.g. 1,800"
                        className="h-9 text-xs font-mono bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="attendeesCount" className="text-xs font-semibold">
                        Attendees Count
                      </Label>
                      <Input
                        id="attendeesCount"
                        maxLength={10}
                        value={attendeesCount}
                        onChange={(e) => setAttendeesCount(e.target.value)}
                        placeholder="e.g. 50K+"
                        className="h-9 text-xs font-mono bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="merchantsCount" className="text-xs font-semibold">
                        Merchants Count
                      </Label>
                      <Input
                        id="merchantsCount"
                        maxLength={10}
                        value={merchantsCount}
                        onChange={(e) => setMerchantsCount(e.target.value)}
                        placeholder="e.g. 340+"
                        className="h-9 text-xs font-mono bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Contact & Footer */}
              {activeSection === "contact" && (
                <div className="space-y-6">
                  {/* Contact Details Card */}
                  <div className="rounded-[14px] border border-border/80 bg-card p-5 sm:p-6 shadow-2xs space-y-4">
                    <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        Contact Details
                      </h3>
                      <span className="text-[11px] text-muted-foreground">
                        Footer and contact page support details
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                      <div className="space-y-1.5">
                        <Label htmlFor="contactPhone" className="text-xs font-semibold flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
                        </Label>
                        <Input
                          id="contactPhone"
                          maxLength={15}
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="e.g. 919876543210"
                          className="h-9 text-xs font-mono bg-background"
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
                          className="h-9 text-xs bg-background"
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
                          className="h-9 text-xs bg-background"
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
                          className="h-9 text-xs bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Visual Card */}
                  <ImageUploadField
                    id="contactImage"
                    label="Contact Image"
                    value={contactImage}
                    onChange={setContactImage}
                    placeholder="https://images.unsplash.com/photo-..."
                    token={token}
                    aspectRatioClass="aspect-[16/9]"
                    recommendedDimensions="Recommended: 1200 × 900 px"
                  />
                </div>
              )}

              {/* Single Clear Save Action */}
              <div className="pt-2 flex items-center justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-2 cursor-pointer shadow-xs"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHomepageSettings;
