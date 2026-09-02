import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Award, Globe, Heart } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { STATIC_IMAGES } from "@/lib/staticImages";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
const values = [
    {
        icon: Heart,
        title: "Passion for Excellence",
        description: "Every event we touch is treated as a once-in-a-lifetime occasion. We pour creativity, precision, and genuine care into every detail — no matter the scale.",
    },
    {
        icon: Users,
        title: "People-First Approach",
        description: "We believe great events are about human connection. Our team prioritizes the guest experience at every stage, from initial concept to final applause.",
    },
    {
        icon: Award,
        title: "Proven Track Record",
        description: "With over 1,800 successful events across weddings, corporates, and brand activations, our portfolio speaks for itself. Quality is non-negotiable.",
    },
    {
        icon: Globe,
        title: "Global Perspective",
        description: "Drawing from international trends and local culture, we craft events that feel both globally sophisticated and personally meaningful to every client.",
    },
];

const AboutUs = () => {
    const settings = useHomepageSettings();
    const stats = [
        { value: settings.eventsCount, label: "Events Hosted" },
        { value: settings.attendeesCount, label: "Happy Attendees" },
        { value: settings.merchantsCount, label: "Trusted Merchants" },
        { value: settings.aboutExperience, label: "Years Experience" },
    ];
    return (<Layout>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        {/* Background image — lighter overlay so it's clearly visible */}
        <img src={STATIC_IMAGES.aboutHero} alt="Elegant event management team coordinating a luxury celebration" className="h-[50vh] min-h-[320px] w-full object-cover sm:h-[55vh] md:h-[60vh] lg:h-[65vh]" loading="eager"/>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"/>
        <div className="absolute inset-0 flex items-center pt-20">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">About Us</p>
              <h1 className="mt-4 font-display text-2xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                {(() => {
            const parts = settings.aboutTitle.split(" ");
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
            return settings.aboutTitle;
        })()}
              </h1>
              <p className="mt-5 text-lg text-white/75">
                {settings.aboutSubtitle}
              </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/portfolio">
                <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  View Our Portfolio <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline">Contact Us</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* ── Stats ─────────────────────────────────────── */}
    <section className="border-y border-border bg-secondary/30 py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-2 lg:grid-cols-4 sm:gap-8">
          {stats.map((s, i) => (<motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="font-display text-2xl sm:text-4xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </motion.div>))}
        </div>
      </div>
    </section>

    {/* ── Who we are + Second Image ─────────────────── */}
    <section className="container mx-auto py-20">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Text */}
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Who We Are</p>
          <h2 className="font-display mt-3 text-4xl font-bold leading-tight">
            A team that lives and breathes <span className="text-primary">events</span>
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            We are a modern event management team focused on premium weddings, business events, private celebrations, and branded experiences. Our workflow combines creative concepts with reliable on-ground execution so clients get both beauty and structure.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Founded in 2014, Eventoza has grown from a boutique planning studio into a full-service digital platform connecting clients with the best event professionals in the industry. Every feature we build, every merchant we onboard, and every event we host is driven by one goal: making your occasion truly unforgettable.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
            { label: "Creative Direction", desc: "Mood, visual identity, and guest journey crafted from scratch." },
            { label: "Precision Planning", desc: "Timelines, vendors, and every detail mapped with control." },
            { label: "Guest Experience", desc: "Polished, personal moments that last long after the event." },
            { label: "End-to-End Support", desc: "From first concept call to post-event debrief, we're with you." },
        ].map((item) => (<div key={item.label} className="rounded-xl border border-border bg-card p-4">
                <div className="font-semibold text-foreground text-sm">{item.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
              </div>))}
          </div>
        </motion.div>

        {/* Second Image — placed to the right of the "Who we are" text */}
        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
          <div className="overflow-hidden rounded-3xl shadow-2xl">
            <img src={settings.aboutImage || "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=900&q=80"} alt="Our team collaborating on event details" className="h-[480px] w-full object-cover"/>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/40 to-transparent"/>
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-5 -left-5 rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="font-display text-xl sm:text-3xl font-bold text-primary">{settings.aboutExperience || "12+"}</div>
            <div className="text-xs text-muted-foreground">Years of excellence</div>
          </div>
        </motion.div>
      </div>
    </section>

    {/* ── Our Values ────────────────────────────────── */}
    <section className="bg-secondary/20 py-20">
      <div className="container mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Our Values</p>
          <h2 className="font-display mt-3 text-4xl font-bold">What drives everything we do</h2>
        </motion.div>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (<motion.div key={v.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <v.icon className="h-6 w-6 text-primary"/>
              </div>
              <h3 className="font-display text-lg font-bold">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.description}</p>
            </motion.div>))}
        </div>
      </div>
    </section>

    {/* ── How We Work ───────────────────────────────── */}
    <section className="container mx-auto py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Our Process</p>
        <h2 className="font-display mt-3 text-4xl font-bold">How we work</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          We begin with discovery, move into concept design and planning, then handle vendor coordination, production, setup, and live event supervision — giving every stakeholder a clear role throughout.
        </p>
      </motion.div>
      <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
            { step: "01", title: "Discovery", desc: "We listen deeply to understand your vision, goals, budget, and audience." },
            { step: "02", title: "Concept & Design", desc: "Our creatives develop themes, mood boards, and a detailed event blueprint." },
            { step: "03", title: "Coordination", desc: "Vendors, timelines, logistics, and every moving part fall into place." },
            { step: "04", title: "Live Execution", desc: "Our on-ground team manages the day so you can enjoy every moment." },
        ].map((item, i) => (<motion.div key={item.step} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="relative rounded-2xl border border-border bg-card p-6">
            <div className="font-display text-5xl font-bold text-primary/15">{item.step}</div>
            <h3 className="font-display mt-2 text-xl font-bold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
          </motion.div>))}
      </div>
    </section>



    {/* ── CTA ───────────────────────────────────────── */}
    <section className="container mx-auto py-20">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl bg-gradient-to-br from-primary/20 via-secondary to-background border border-primary/20 p-12 text-center">
        <h2 className="font-display text-xl sm:text-4xl font-bold">Ready to create something extraordinary?</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Let's bring your vision to life. Whether it's an intimate gathering or a grand celebration, our team is ready.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/events">
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              Explore Events <ArrowRight className="ml-2 h-4 w-4"/>
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
export default AboutUs;
