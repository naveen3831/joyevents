import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Home, Save, RefreshCw, Mail, Phone, MapPin, Clock, Sparkles, Activity, Users, Briefcase } from "lucide-react";
import { apiGetHomepageSettings, apiSaveHomepageSettings } from "@/lib/api";

const AdminHomepageSettings = () => {
  const { token } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (err: any) {
      toast.error(err?.message || "Failed to load homepage settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!heroTitle.trim() || !heroSubtitle.trim()) {
      toast.error("Hero Title and Subtitle are required");
      return;
    }

    if (!aboutTitle.trim() || !aboutSubtitle.trim()) {
      toast.error("About Us Title and Subtitle are required");
      return;
    }

    if (!portfolioTitle.trim() || !portfolioSubtitle.trim()) {
      toast.error("Portfolio Title and Subtitle are required");
      return;
    }

    // Phone format validation (exactly 12 digits)
    if (contactPhone.trim()) {
      const phoneRegex = /^[0-9]{12}$/;
      if (!phoneRegex.test(contactPhone.trim())) {
        toast.error("Invalid Phone Number. Must contain exactly 12 numeric digits (no letters, spaces, or special characters).");
        return;
      }
    }

    // Email format validation
    if (contactEmail.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(contactEmail.trim())) {
        toast.error("Invalid Support Email. Please enter a valid email address (e.g. info@joyevents.com).");
        return;
      }
    }

    setSaving(true);
    try {
      await apiSaveHomepageSettings({
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
        contactImage
      }, token);
      toast.success("Homepage and pages settings updated successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <section className="py-8 max-w-4xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold flex items-center gap-2">
                <Home className="h-8 w-8 text-primary" /> Homepage <span className="text-gradient">CMS Editor</span>
              </h1>
              <p className="text-muted-foreground mt-1">Manage the hero content, metrics statistics, and contact info displayed on the public landing page.</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadSettings} disabled={loading} className="border-border hover:bg-secondary">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Reload
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" /> Loading homepage settings...
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Hero Section */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 sm:p-8 space-y-4 shadow-lg">
                <h2 className="font-display text-lg font-bold flex items-center gap-2 border-b border-border pb-3">
                  <Sparkles className="h-5 w-5 text-yellow-500" /> Hero & Header Content
                </h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="heroTitle">Hero Title *</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{heroTitle.length}/100</span>
                    </div>
                    <Input
                      id="heroTitle"
                      required
                      maxLength={100}
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      placeholder="e.g. Create Unforgettable Moments"
                      className="bg-secondary"
                    />
                    <p className="text-[10px] text-muted-foreground">The middle word will be styled with a vibrant gradient link.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroSubtitle">Hero Subtitle / Description *</Label>
                    <Textarea
                      id="heroSubtitle"
                      required
                      maxLength={500}
                      rows={4}
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      placeholder="e.g. From intimate workshops to grand festivals..."
                      className="bg-secondary"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{heroSubtitle.length}/500 characters</p>
                  </div>
                </div>
              </div>

              {/* About Us Page Content */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 sm:p-8 space-y-4 shadow-lg">
                <h2 className="font-display text-lg font-bold flex items-center gap-2 border-b border-border pb-3">
                  <Users className="h-5 w-5 text-teal-500" /> About Us Page Content
                </h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="aboutTitle">About Us Title *</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{aboutTitle.length}/100</span>
                    </div>
                    <Input
                      id="aboutTitle"
                      required
                      maxLength={100}
                      value={aboutTitle}
                      onChange={(e) => setAboutTitle(e.target.value)}
                      placeholder="e.g. We build unforgettable event experiences"
                      className="bg-secondary"
                    />
                    <p className="text-[10px] text-muted-foreground">The middle word will be styled with a secondary color highlight.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="aboutExperience">Platform Years of Experience</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">{aboutExperience.length}/20</span>
                      </div>
                      <Input
                        id="aboutExperience"
                        maxLength={20}
                        value={aboutExperience}
                        onChange={(e) => setAboutExperience(e.target.value)}
                        placeholder="e.g. 12+"
                        className="bg-secondary"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aboutSubtitle">About Us Subtitle / Description *</Label>
                    <Textarea
                      id="aboutSubtitle"
                      required
                      maxLength={500}
                      rows={3}
                      value={aboutSubtitle}
                      onChange={(e) => setAboutSubtitle(e.target.value)}
                      placeholder="Describe the company mission and goals..."
                      className="bg-secondary"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{aboutSubtitle.length}/500 characters</p>
                  </div>
                </div>
              </div>

              {/* Our Portfolio Page Content */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 sm:p-8 space-y-4 shadow-lg">
                <h2 className="font-display text-lg font-bold flex items-center gap-2 border-b border-border pb-3">
                  <Briefcase className="h-5 w-5 text-orange-500" /> Our Portfolio Page Content
                </h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="portfolioTitle">Portfolio Title *</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{portfolioTitle.length}/100</span>
                    </div>
                    <Input
                      id="portfolioTitle"
                      required
                      maxLength={100}
                      value={portfolioTitle}
                      onChange={(e) => setPortfolioTitle(e.target.value)}
                      placeholder="e.g. A portfolio shaped by atmosphere, scale, and detail"
                      className="bg-secondary"
                    />
                    <p className="text-[10px] text-muted-foreground">The middle word will be styled with a highlighted color.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="portfolioCategories">Event Categories Count</Label>
                      <Input
                        id="portfolioCategories"
                        maxLength={5}
                        value={portfolioCategories}
                        onChange={(e) => setPortfolioCategories(e.target.value)}
                        placeholder="e.g. 12+"
                        className="bg-secondary"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolioSubtitle">Portfolio Subtitle / Description *</Label>
                    <Textarea
                      id="portfolioSubtitle"
                      required
                      maxLength={500}
                      rows={3}
                      value={portfolioSubtitle}
                      onChange={(e) => setPortfolioSubtitle(e.target.value)}
                      placeholder="Describe the portfolio summary..."
                      className="bg-secondary"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{portfolioSubtitle.length}/500 characters</p>
                  </div>
                </div>
              </div>

              {/* Statistics Row */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 sm:p-8 space-y-4 shadow-lg">
                <h2 className="font-display text-lg font-bold flex items-center gap-2 border-b border-border pb-3">
                  <Activity className="h-5 w-5 text-indigo-500" /> Home Stats & Metrics Banner
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventsCount">Events Count</Label>
                    <Input
                      id="eventsCount"
                      maxLength={5}
                      value={eventsCount}
                      onChange={(e) => setEventsCount(e.target.value)}
                      placeholder="e.g. 1,800"
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attendeesCount">Attendees Count</Label>
                    <Input
                      id="attendeesCount"
                      maxLength={5}
                      value={attendeesCount}
                      onChange={(e) => setAttendeesCount(e.target.value)}
                      placeholder="e.g. 50K+"
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="merchantsCount">Merchants Count</Label>
                    <Input
                      id="merchantsCount"
                      maxLength={5}
                      value={merchantsCount}
                      onChange={(e) => setMerchantsCount(e.target.value)}
                      placeholder="e.g. 340+"
                      className="bg-secondary"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 sm:p-8 space-y-4 shadow-lg">
                <h2 className="font-display text-lg font-bold flex items-center gap-2 border-b border-border pb-3">
                  <Phone className="h-5 w-5 text-green-500" /> Contact Info & Footer Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone Number</Label>
                    <Input
                      id="contactPhone"
                      maxLength={12}
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
                      placeholder="e.g. 919876543210"
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="contactEmail" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Support Email</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{contactEmail.length}/50</span>
                    </div>
                    <Input
                      id="contactEmail"
                      type="email"
                      maxLength={50}
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="e.g. info@joyevents.com"
                      className="bg-secondary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="contactAddress" className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Address / Location</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{contactAddress.length}/150</span>
                    </div>
                    <Input
                      id="contactAddress"
                      maxLength={150}
                      value={contactAddress}
                      onChange={(e) => setContactAddress(e.target.value)}
                      placeholder="e.g. Mumbai, India"
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="contactWorkingHours" className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Business Hours</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{contactWorkingHours.length}/100</span>
                    </div>
                    <Input
                      id="contactWorkingHours"
                      maxLength={100}
                      value={contactWorkingHours}
                      onChange={(e) => setContactWorkingHours(e.target.value)}
                      placeholder="e.g. Mon–Fri, 9am–6pm IST"
                      className="bg-secondary"
                    />
                  </div>
                </div>
              </div>

              {/* Page Images */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 sm:p-8 space-y-4 shadow-lg">
                <h2 className="font-display text-lg font-bold flex items-center gap-2 border-b border-border pb-3">
                  <Activity className="h-5 w-5 text-purple-500" /> Page Banner & Illustration Images
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="heroImage">Home Page Hero Image URL</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{heroImage.length}/500</span>
                    </div>
                    <Input
                      id="heroImage"
                      maxLength={500}
                      value={heroImage}
                      onChange={(e) => setHeroImage(e.target.value)}
                      placeholder="Enter image URL..."
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="eventsImage">Events Page Banner Image URL</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{eventsImage.length}/500</span>
                    </div>
                    <Input
                      id="eventsImage"
                      maxLength={500}
                      value={eventsImage}
                      onChange={(e) => setEventsImage(e.target.value)}
                      placeholder="Enter image URL..."
                      className="bg-secondary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="servicesImage">Services Page Banner Image URL</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{servicesImage.length}/500</span>
                    </div>
                    <Input
                      id="servicesImage"
                      maxLength={500}
                      value={servicesImage}
                      onChange={(e) => setServicesImage(e.target.value)}
                      placeholder="Enter image URL..."
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="aboutImage">About Us Illustration Image URL</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{aboutImage.length}/500</span>
                    </div>
                    <Input
                      id="aboutImage"
                      maxLength={500}
                      value={aboutImage}
                      onChange={(e) => setAboutImage(e.target.value)}
                      placeholder="Enter image URL..."
                      className="bg-secondary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="portfolioImage">Portfolio Illustration Image URL</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{portfolioImage.length}/500</span>
                    </div>
                    <Input
                      id="portfolioImage"
                      maxLength={500}
                      value={portfolioImage}
                      onChange={(e) => setPortfolioImage(e.target.value)}
                      placeholder="Enter image URL..."
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="contactImage">Contact Us Illustration Image URL</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{contactImage.length}/500</span>
                    </div>
                    <Input
                      id="contactImage"
                      maxLength={500}
                      value={contactImage}
                      onChange={(e) => setContactImage(e.target.value)}
                      placeholder="Enter image URL..."
                      className="bg-secondary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="submit" disabled={saving} className="bg-gradient-primary text-white px-8">
                  <Save className="h-4 w-4 mr-2" /> {saving ? "Saving Changes..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </section>
    </AdminLayout>
  );
};

export default AdminHomepageSettings;
