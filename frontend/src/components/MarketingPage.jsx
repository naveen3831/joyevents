import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
const MarketingPage = ({ eyebrow, title, description, image, imageAlt, highlights, detailBlocks, primaryCta, secondaryCta, }) => {
    return (<Layout>
      <section className="pb-12 sm:pb-16">
        <div className="relative isolate overflow-hidden">
          <img src={image} alt={imageAlt} className="h-[65vh] w-full object-cover" loading="lazy"/>
          <div className="absolute inset-0 bg-black/55"/>
          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto pb-8 sm:pb-12">
              <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl rounded-2xl border border-border bg-card/80 p-5 sm:p-8 backdrop-blur">
                <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
                <h1 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-4xl md:text-6xl">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base md:text-lg">{description}</p>
                <div className="mt-5 sm:mt-8 flex flex-wrap gap-3">
                  <Link to={primaryCta.to}>
                    <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 text-sm">
                      {primaryCta.label}
                      <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                  </Link>
                  {secondaryCta && (<Link to={secondaryCta.to}>
                      <Button variant="outline" className="text-sm">{secondaryCta.label}</Button>
                    </Link>)}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="container mx-auto pt-8 sm:pt-12">
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
            {highlights.map((item, index) => (<motion.article key={item.title} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.12 }} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </motion.article>))}
          </div>

          <div className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 lg:grid-cols-2">
            {detailBlocks.map((item, index) => (<motion.section key={item.title} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.12 }} className="rounded-2xl border border-border bg-secondary/40 p-6 sm:p-8">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{item.title}</h2>
                <p className="mt-3 text-sm sm:text-base leading-7 text-muted-foreground">{item.description}</p>
              </motion.section>))}
          </div>
        </div>
      </section>
    </Layout>);
};
export default MarketingPage;
