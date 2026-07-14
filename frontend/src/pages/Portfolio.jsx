import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Award, TrendingUp, Layers } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { STATIC_IMAGES } from "@/lib/staticImages";
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
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
const Portfolio = () => {
    const settings = useHomepageSettings();
    const METRICS = [
        { icon: Award, value: settings.eventsCount, label: "Events Completed" },
        { icon: TrendingUp, value: settings.attendeesCount, label: "Guests Served" },
        { icon: Layers, value: settings.portfolioCategories, label: "Event Categories" },
    ];
    return (<Layout>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <img src={STATIC_IMAGES.portfolioHero} alt="Our Portfolio" className="h-[75vh] w-full object-cover" loading="eager"/>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"/>
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto">
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Our Portfolio</p>
              <h1 className="mt-4 font-display text-lg sm:text-2xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
                {(() => {
            const parts = settings.portfolioTitle.split(" ");
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
              <p className="mt-5 text-lg text-white/75">
                {settings.portfolioSubtitle}
              </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/events">
                <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  Book an Event <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline">See Services</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* ── Metrics ───────────────────────────────────── */}
    <section className="border-y border-border bg-secondary/30 py-10">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {METRICS.map((m, i) => (<motion.div key={m.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="font-display text-xl sm:text-4xl font-bold text-primary">{m.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{m.label}</div>
            </motion.div>))}
        </div>
      </div>
    </section>

    {/* ── Project Grid ──────────────────────────────── */}
    <section className="container mx-auto py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Featured Work</p>
        <h2 className="font-display mt-3 text-4xl font-bold">
          Events we're <span className="text-primary">proud of</span>
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Each project in our portfolio is a testament to meticulous planning, creative vision, and flawless execution.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((project, i) => (<motion.div key={project.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="group overflow-hidden rounded-2xl border border-border bg-card flex flex-col">
            <div className="relative h-56 overflow-hidden">
              <img src={project.image} alt={project.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
              <span className="absolute left-4 top-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground">
                {project.category}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{project.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.tags.map((tag) => (<span key={tag} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                    {tag}
                  </span>))}
              </div>
            </div>
          </motion.div>))}
      </div>
    </section>

    {/* ── Results + Second Image ────────────────────── */}
    <section className="bg-secondary/20 py-20">
      <div className="container mx-auto">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          {/* Text */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Our Approach</p>
            <h2 className="font-display mt-3 text-4xl font-bold leading-tight">
              Results clients <span className="text-primary">remember</span>
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Our portfolio reflects a balance of visual impact and operational discipline. Guests experience polished arrival moments, smooth transitions, and thoughtful details — while organizers stay supported by a clear management system at every step.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Showing event history, delivered formats, and planning quality helps customers feel confident, merchants present stronger services, and admins maintain quality standards across the platform.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
            { label: "Executive Summits", desc: "Stage, registration, and premium hospitality at scale." },
            { label: "Luxury Weddings", desc: "Elegant styling, floral design, and seamless transitions." },
            { label: "Brand Activations", desc: "Immersive visuals, live moments, and social-ready setups." },
            { label: "Cultural Festivals", desc: "Large-scale outdoor events with multi-vendor coordination." },
        ].map((item) => (<div key={item.label} className="rounded-xl border border-border bg-card p-4">
                  <div className="font-semibold text-sm text-foreground">{item.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
                </div>))}
            </div>
          </motion.div>

          {/* Second image */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
            <div className="overflow-hidden rounded-3xl shadow-2xl">
              <img src={settings.portfolioImage || "https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&q=80"} alt="Behind the scenes event setup" className="h-[480px] w-full object-cover"/>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/40 to-transparent"/>
            </div>
            <div className="absolute -bottom-5 -left-5 rounded-2xl border border-border bg-card p-4 shadow-xl">
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* ── Testimonials ──────────────────────────────── */}
    <section className="container mx-auto py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Testimonials</p>
        <h2 className="font-display mt-3 text-4xl font-bold">What our clients say</h2>
      </motion.div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
        {[
            { quote: "JoyEvents transformed our annual summit into a world-class experience. The attention to detail was unmatched.", name: "Sarah Chen", role: "VP Operations, NovaTech" },
            { quote: "Our wedding was everything we dreamed of and more. The team managed every tiny detail so we could just enjoy the day.", name: "James & Priya Harrington", role: "Wedding Clients" },
            { quote: "The brand activation exceeded all our KPIs. Media coverage, social engagement, guest experience — all top-tier.", name: "Marcus Webb", role: "Marketing Director, Brandify" },
        ].map((t, i) => (<motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
            <div className="mt-4 font-semibold text-foreground text-sm">{t.name}</div>
            <div className="text-xs text-muted-foreground">{t.role}</div>
          </motion.div>))}
      </div>
    </section>

    {/* ── CTA ───────────────────────────────────────── */}
    <section className="container mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl bg-gradient-to-br from-primary/20 via-secondary to-background border border-primary/20 p-12 text-center">
        <h2 className="font-display text-2xl sm:text-4xl font-bold">Let's create your next success story</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Your event deserves a place in our portfolio. Let's build something extraordinary together.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/events">
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              Book an Event <ArrowRight className="ml-2 h-4 w-4"/>
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline">Get in Touch</Button>
          </Link>
        </div>
      </motion.div>
    </section>
  </Layout>);
};
export default Portfolio;
