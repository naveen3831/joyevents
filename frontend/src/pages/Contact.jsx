import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Phone, MapPin, Clock, Send, MessageSquare } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STATIC_IMAGES } from "@/lib/staticImages";
import { useState } from "react";
import { toast } from "sonner";
import { usePlatformName } from "@/hooks/usePlatformName";
import { apiSendContactUsToAdmin } from "@/lib/api";
import { sanitizeEmailInput, sanitizeNameInput, sanitizeSubjectInput, sanitizeMessageInput, validateEmail, validateName, validateSubject, validateMessage, NAME_MAX_LENGTH, SUBJECT_MAX_LENGTH, MESSAGE_MAX_LENGTH, EMAIL_MAX_LENGTH, NAME_HINT, SUBJECT_HINT, MESSAGE_HINT, EMAIL_HINT, } from "@/lib/validation";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { Reveal, StaggerGroup, StaggerItem, CountUp, FloatingBalloons } from "@/components/motion/MotionSystem";

const Contact = () => {
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
    const [sending, setSending] = useState(false);
    const platformName = usePlatformName();
    const settings = useHomepageSettings();
    const CONTACT_INFO = [
        { icon: Mail, title: "Email Us", value: settings.contactEmail, desc: "For proposals, event planning questions, and project discussions.", href: `mailto:${settings.contactEmail}` },
        { icon: Phone, title: "Call Us", value: settings.contactPhone, desc: "Fast communication on timelines, budgets, and availability.", href: `tel:${settings.contactPhone}` },
        { icon: MapPin, title: "Visit Us", value: settings.contactAddress, desc: "In-person planning sessions and creative reviews by appointment.", href: `https://www.google.com/maps/search/${encodeURIComponent(settings.contactAddress)}` },
        { icon: Clock, title: "Business Hours", value: settings.contactWorkingHours, desc: "Average response time under 2 hours during business hours." },
    ];
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.message) {
            toast.error("Please fill in all required fields");
            return;
        }
        const nameErr = validateName(form.name);
        if (nameErr) {
            toast.error(nameErr);
            return;
        }
        const emailErr = validateEmail(form.email);
        if (emailErr) {
            toast.error(emailErr);
            return;
        }
        const subjectErr = validateSubject(form.subject);
        if (subjectErr) {
            toast.error(subjectErr);
            return;
        }
        const messageErr = validateMessage(form.message);
        if (messageErr) {
            toast.error(messageErr);
            return;
        }
        setSending(true);
        try {
            await apiSendContactUsToAdmin({
                name: form.name.trim(),
                email: form.email.trim(),
                subject: form.subject?.trim() || "",
                message: form.message.trim(),
            });
            toast.success("Message sent! We'll get back to you within 24 hours.");
            setForm({ name: "", email: "", subject: "", message: "" });
        }
        catch (err) {
            toast.error(err?.message || "Failed to send message. Please try again.");
        }
        finally {
            setSending(false);
        }
    };
    return (
      <Layout>
        {/* ── Hero ─────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden">
          <FloatingBalloons count={6} />
          <img src={STATIC_IMAGES.contactHero} alt="Event planning consultation" className="h-[50vh] min-h-[320px] w-full object-cover sm:h-[55vh] md:h-[60vh] lg:h-[65vh]" loading="eager"/>
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent"/>
          <div className="absolute inset-0 flex items-center pt-20">
            <div className="container mx-auto px-4 sm:px-6">
              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Contact Us</p>
                <h1 className="mt-4 font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
                  Let's plan your next event with <span className="text-primary">clarity</span>
                </h1>
                <p className="mt-5 text-base sm:text-lg text-white/80">
                  Tell us what you're planning and we'll help shape the right event workflow, service package, and execution path.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/services">
                    <Button className="group bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 hover:-translate-y-0.5 transition-all">
                      Explore Services <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"/>
                    </Button>
                  </Link>
                  <Link to="/events">
                    <Button variant="outline" className="text-white border-white/30 hover:bg-white/10 hover:-translate-y-0.5 transition-all">Browse Events</Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Stats ───────────────────────────────────── */}
        <section className="border-y border-border bg-secondary/30 py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-6 text-center lg:grid-cols-4 sm:gap-8">
              {[
                { value: "< 2 hrs", isString: true, label: "Avg. Response Time" },
                { value: 1800, suffix: "+", label: "Events Supported" },
                { value: 98, suffix: "%", label: "Client Satisfaction" },
                { value: "24/7", isString: true, label: "On-Event Support" },
              ].map((s, i) => (
                <Reveal key={s.label} delay={i * 0.08}>
                  <div className="font-display text-2xl sm:text-4xl font-bold text-primary">
                    {s.isString ? s.value : <CountUp end={s.value} suffix={s.suffix} />}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contact Info + Form ─────────────────────── */}
        <section className="container mx-auto py-16 sm:py-20 px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Left: Contact info */}
            <motion.div initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">Get in Touch</p>
              <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold leading-tight">
                We're here to help, <span className="text-gradient-animated">every step of the way</span>
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed text-sm sm:text-base">
                Whether you're planning an intimate gathering or a large-scale celebration, our team is ready to guide you through every decision. Reach out — we typically respond within 2 hours.
              </p>

              <StaggerGroup stagger={0.08} className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-1">
                {CONTACT_INFO.map((item) => {
                  const cardContent = (
                    <div className="flex items-start gap-2.5 sm:gap-4">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-xs sm:text-sm">{item.title}</div>
                        <div className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.desc}</div>
                        <div className="mt-1 text-xs sm:text-sm font-semibold text-primary truncate">{item.value}</div>
                      </div>
                    </div>
                  );
                  if (item.href) {
                      return (
                        <StaggerItem key={item.title}>
                          <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer noopener" : undefined} className="block rounded-xl border border-border bg-card p-3 sm:p-4 transition-all duration-200 hover:border-primary/50 hover:-translate-y-0.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                            {cardContent}
                          </a>
                        </StaggerItem>
                      );
                  }
                  return (
                    <StaggerItem key={item.title}>
                      <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm">
                        {cardContent}
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerGroup>

              {/* Second image */}
              <Reveal delay={0.2} className="relative mt-8 overflow-hidden rounded-3xl shadow-2xl">
                <img src={settings.contactImage || "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=900&q=80"} alt="Our team ready to assist" className="h-[300px] w-full object-cover transition-transform duration-700 hover:scale-105"/>
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/50 to-transparent"/>
                <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/20 bg-black/40 p-4 backdrop-blur-md">
                  <div className="font-semibold text-white text-sm">Ready when you are</div>
                  <div className="text-xs text-white/80 mt-0.5">Let's make your event unforgettable</div>
                </div>
              </Reveal>
            </motion.div>

            {/* Right: Contact form */}
            <motion.div initial={{ opacity: 0, x: 15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-card">
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="h-5 w-5"/>
                  </div>
                  <h3 className="font-display text-lg sm:text-2xl font-bold">Send us a message</h3>
                </div>
                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Your Name *</label>
                      <Input placeholder="John Doe" maxLength={NAME_MAX_LENGTH} value={form.name} onChange={(e) => setForm({ ...form, name: sanitizeNameInput(e.target.value) })} className="bg-secondary/60 border-border h-11 text-sm rounded-xl focus-visible:ring-primary/40 focus-visible:border-primary transition-all" required/>
                      <p className="mt-1 text-[11px] text-muted-foreground">{NAME_HINT}</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Your Email *</label>
                      <Input type="text" inputMode="email" maxLength={EMAIL_MAX_LENGTH} placeholder="user@gmail.com" value={form.email} onChange={(e) => setForm({ ...form, email: sanitizeEmailInput(e.target.value) })} className="bg-secondary/60 border-border h-11 text-sm rounded-xl focus-visible:ring-primary/40 focus-visible:border-primary transition-all" required/>
                      <p className="mt-1 text-[11px] text-muted-foreground">{EMAIL_HINT}</p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Subject</label>
                    <Input placeholder="Wedding enquiry" maxLength={SUBJECT_MAX_LENGTH} value={form.subject} onChange={(e) => setForm({ ...form, subject: sanitizeSubjectInput(e.target.value) })} className="bg-secondary/60 border-border h-11 text-sm rounded-xl focus-visible:ring-primary/40 focus-visible:border-primary transition-all"/>
                    <p className="mt-1 text-[11px] text-muted-foreground">{SUBJECT_HINT}</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">Message *</label>
                    <Textarea placeholder="Tell us about your event..." rows={5} maxLength={MESSAGE_MAX_LENGTH} value={form.message} onChange={(e) => setForm({ ...form, message: sanitizeMessageInput(e.target.value) })} className="bg-secondary/60 border-border text-sm rounded-xl focus-visible:ring-primary/40 focus-visible:border-primary transition-all resize-none" required/>
                    <p className="mt-1 text-[11px] text-muted-foreground">{MESSAGE_HINT}</p>
                  </div>
                  <Button type="submit" className="group w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 hover:-translate-y-0.5 transition-all text-sm font-semibold" disabled={sending}>
                    {sending ? (<>Sending…</>) : (<>
                        Send Message <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"/>
                      </>)}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    By submitting, you agree to our Privacy Policy. We'll never share your information.
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────── */}
        <section className="container mx-auto pb-20 px-4 sm:px-6">
          <Reveal className="rounded-3xl bg-gradient-to-br from-primary/20 via-secondary to-background border border-primary/20 p-8 sm:p-12 text-center">
            <h2 className="font-display text-2xl sm:text-4xl font-bold">Still have questions?</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-sm sm:text-base">
              Our support team is available Monday–Friday, 9am–6pm. We typically respond within 2 hours.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href={`tel:${settings.contactPhone}`}>
                <Button className="group gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 hover:-translate-y-0.5 transition-all">
                  <Phone className="h-4 w-4"/> Call Now
                </Button>
              </a>
              <Link to="/about">
                <Button variant="outline" className="hover:-translate-y-0.5 transition-all">Learn More About Us</Button>
              </Link>
            </div>
          </Reveal>
        </section>
      </Layout>
    );
};
export default Contact;
