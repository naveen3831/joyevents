import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Award, TrendingUp, Layers } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { STATIC_IMAGES } from "@/lib/staticImages";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { Reveal, StaggerGroup, StaggerItem, CountUp } from "@/components/motion/MotionSystem";

const PROJECTS = [
    {
        category: "Corporate",
        title: "Executive Summit 2025",
        description: "Large-format conference for 800+ executives featuring custom stage design, live streaming, breakout sessions, and premium hospitality.",
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
        tags: ["Stage Design", "AV Production", "Hospitality"],
    },
    {
        category: "Wedding",
        title: "The Harrington Wedding",
        description: "An intimate luxury wedding for 200 guests with bespoke floral design, candlelit ceremony, and a seamless ceremony-to-reception flow.",
        image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
        tags: ["Decor", "Catering", "Photography"],
    },
    {
        category: "Brand Activation",
        title: "NovaTech Product Launch",
        description: "Immersive brand activation attended by 1,200 guests, featuring interactive displays, live DJ, social media walls, and press coverage.",
        image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
        tags: ["Brand Activation", "Live Entertainment", "PR"],
    },
    {
        category: "Gala Dinner",
        title: "Annual Charity Gala",
        description: "Black-tie charity gala for 500 guests with silent auction, live orchestra, custom table settings, and a fully managed donation flow.",
        image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
        tags: ["Decor", "Catering", "Entertainment"],
    },
    {
        category: "Festival",
        title: "Urban Food & Culture Festival",
        description: "A two-day outdoor festival with 30 food vendors, live performances, artist installations, and 5,000+ daily attendees.",
        image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
        tags: ["Logistics", "Vendor Management", "Live Events"],
    },
    {
        category: "Workshop",
        title: "CreativeMinds Workshop Series",
        description: "Monthly intimate workshop series for 50 attendees, blending hands-on learning with curated networking and styled breakout spaces.",
        image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
        tags: ["Planning", "Venue", "Styling"],
    },
];

const Portfolio = () => {
    const settings = useHomepageSettings();
    const METRICS = [
        { icon: Award, value: settings.eventsCount || 1800, suffix: "+", label: "Events Completed" },
        { icon: TrendingUp, value: settings.attendeesCount || 50000, suffix: "+", label: "Guests Served" },
        { icon: Layers, value: settings.portfolioCategories || 18, suffix: "+", label: "Event Categories" },
    ];
    return (
      <Layout>
        {/* ── Hero ─────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden">
          <img src={STATIC_IMAGES.portfolioHero} alt="Our Portfolio" className="h-[50vh] min-h-[320px] w-full object-cover sm:h-[55vh] md:h-[60vh] lg:h-[65vh]" loading="eager"/>
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent"/>
          <div className="absolute inset-0 flex items-center pt-20">
            <div className="container mx-auto px-4 sm:px-6">
              <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Our Portfolio</p>
                <h1 className="mt-4 font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white">
                  {(() => {
                    const parts = (settings.portfolioTitle || "Extraordinary Moments We Have Created").split(" ");
                    if (parts.length >= 2) {
                        const middleIndex = Math.floor(parts.length / 2);
                        const before = parts.slice(0, middleIndex).join(" ");
                        const middle = parts[middleIndex];
                        const after = parts.slice(middleIndex + 1).join(" ");
                        return (<>
                                {before}{" "}
                                <span className="text-primary">{middle}</span>
                                {after ? ` ${after}` : ""}
                              </>);
                    }
                    return settings.portfolioTitle;
                  })()}
                </h1>
                <p className="mt-5 text-base sm:text-lg text-white/80">
                  {settings.portfolioSubtitle}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/events">
                    <Button className="group bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 hover:-translate-y-0.5 transition-all">
                      Book an Event <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"/>
                    </Button>
                  </Link>
                  <Link to="/services">
                    <Button variant="outline" className="text-white border-white/30 hover:bg-white/10 hover:-translate-y-0.5 transition-all">See Services</Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Metrics ───────────────────────────────────── */}
        <section className="border-y border-border bg-secondary/30 py-8 sm:py-12">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3 sm:gap-8">
              {METRICS.map((m, i) => (
                <Reveal key={m.label} delay={i * 0.1}>
                  <div className="font-display text-2xl sm:text-4xl font-bold text-primary">
                    <CountUp end={m.value} suffix={m.suffix} />
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{m.label}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Project Grid ──────────────────────────────── */}
        <section className="container mx-auto py-16 sm:py-20 px-4 sm:px-6">
          <Reveal className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Featured Work</p>
            <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold">
              Events we're <span className="text-gradient-animated">proud of</span>
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground text-sm sm:text-base">
              Each project in our portfolio is a testament to meticulous planning, creative vision, and flawless execution.
            </p>
          </Reveal>

          <StaggerGroup stagger={0.08} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((project) => (
              <StaggerItem key={project.title}>
                <div className="group overflow-hidden rounded-2xl border border-border bg-card flex flex-col hover:-translate-y-1 transition-all duration-300 shadow-card">
                  <div className="relative h-56 overflow-hidden">
                    <img src={project.image} alt={project.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                    <span className="absolute left-4 top-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                      {project.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{project.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">{project.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-border/60">
                      {project.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-border/80 bg-secondary/80 px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        {/* ── Results + Second Image (Alternating Reveal) ────────────────────── */}
        <section className="bg-secondary/20 py-16 sm:py-20 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* Text entering from left */}
              <motion.div initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
                <p className="text-sm font-semibold uppercase tracking-widest text-primary">Our Approach</p>
                <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold leading-tight">
                  Results clients <span className="text-primary">remember</span>
                </h2>
                <p className="mt-5 text-muted-foreground leading-relaxed text-sm sm:text-base">
                  Our portfolio reflects a balance of visual impact and operational discipline. Guests experience polished arrival moments, smooth transitions, and thoughtful details — while organizers stay supported by a clear management system at every step.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {[
                    { label: "Executive Summits", desc: "Stage, registration, and premium hospitality at scale." },
                    { label: "Luxury Weddings", desc: "Elegant styling, floral design, and seamless transitions." },
                    { label: "Brand Activations", desc: "Immersive visuals, live moments, and social-ready setups." },
                    { label: "Cultural Festivals", desc: "Large-scale outdoor events with multi-vendor coordination." },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border bg-card p-4 hover:-translate-y-0.5 transition-transform duration-200 shadow-sm">
                      <div className="font-semibold text-sm text-foreground">{item.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Second image entering from right */}
              <motion.div initial={{ opacity: 0, x: 15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="relative">
                <div className="overflow-hidden rounded-3xl shadow-2xl">
                  <img src={settings.portfolioImage || "https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&q=80"} alt="Behind the scenes event setup" className="h-[460px] w-full object-cover transition-transform duration-700 hover:scale-105"/>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/40 to-transparent"/>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ──────────────────────────────── */}
        <section className="container mx-auto py-16 sm:py-20 px-4 sm:px-6">
          <Reveal className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Testimonials</p>
            <h2 className="font-display mt-3 text-3xl sm:text-4xl font-bold">What our clients say</h2>
          </Reveal>
          <StaggerGroup stagger={0.1} className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { quote: "Eventoza transformed our annual summit into a world-class experience. The attention to detail was unmatched.", name: "Sarah Chen", role: "VP Operations, NovaTech" },
              { quote: "Our wedding was everything we dreamed of and more. The team managed every tiny detail so we could just enjoy the day.", name: "James & Priya Harrington", role: "Wedding Clients" },
              { quote: "The brand activation exceeded all our KPIs. Media coverage, social engagement, guest experience — all top-tier.", name: "Marcus Webb", role: "Marketing Director, Brandify" },
            ].map((t, i) => (
              <StaggerItem key={i}>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
                  <div className="mt-6 pt-4 border-t border-border/60">
                    <div className="font-semibold text-foreground text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.role}</div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        {/* ── CTA ───────────────────────────────────────── */}
        <section className="container mx-auto pb-20 px-4 sm:px-6">
          <Reveal className="rounded-3xl bg-gradient-to-br from-primary/20 via-secondary to-background border border-primary/20 p-8 sm:p-12 text-center">
            <h2 className="font-display text-2xl sm:text-4xl font-bold">Let's create your next success story</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-sm sm:text-base">
              Your event deserves a place in our portfolio. Let's build something extraordinary together.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/events">
                <Button className="group bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 hover:-translate-y-0.5 transition-all">
                  Book an Event <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"/>
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="hover:-translate-y-0.5 transition-all">Get in Touch</Button>
              </Link>
            </div>
          </Reveal>
        </section>
      </Layout>
    );
};
export default Portfolio;
