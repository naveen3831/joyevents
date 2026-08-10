import { motion } from "framer-motion";
import { Calendar, Clock, User, ArrowRight, Tag, Search } from "lucide-react";
import { useState } from "react";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BLOG_POSTS, CATEGORIES, categoryColors } from "@/data/blogPosts";
const Blog = () => {
    const [activeCategory, setActiveCategory] = useState("All");
    const [search, setSearch] = useState("");
    const filtered = BLOG_POSTS.filter((p) => {
        const matchCat = activeCategory === "All" || p.category === activeCategory;
        const matchSearch = search === "" ||
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.excerpt.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });
    const featured = BLOG_POSTS.filter((p) => p.featured);
    return (<Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background py-24 pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"/>
        <div className="container mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Tag className="h-3.5 w-3.5"/> Eventoza Blog
            </span>
            <h1 className="font-display mt-4 text-2xl font-bold leading-tight sm:text-5xl md:text-6xl">
              Insights &amp; <span className="text-primary">Inspiration</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Expert tips, industry trends, and behind-the-scenes stories to help you plan extraordinary events with confidence.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mx-auto mt-8 flex max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <Input placeholder="Search articles..." value={search} maxLength={30} onChange={(e) => setSearch(e.target.value)} className="pl-9"/>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="mx-auto mt-6">
            <Link to="/contact">
              <Button className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Contact Us
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Posts */}
      {activeCategory === "All" && search === "" && (<section className="container mx-auto py-16">
          <h2 className="font-display mb-8 text-2xl font-bold">
            Featured <span className="text-primary">Articles</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 md:gap-8 md:grid-cols-2">
            {featured.map((post, i) => (<motion.article key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="group relative overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative h-56 overflow-hidden">
                  <img src={post.image} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
                  <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${categoryColors[post.category]}`}>
                    {post.category}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display mb-2 text-xl font-bold leading-snug group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><User className="h-3 w-3"/>{post.author}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>{post.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{post.readTime}</span>
                    </div>
                    <Link to={`/blog/${post.id}`} className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
                      Read more <ArrowRight className="h-3 w-3"/>
                    </Link>
                  </div>
                </div>
              </motion.article>))}
          </div>
        </section>)}

      {/* Category Filter */}
      <section className="container mx-auto pb-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${activeCategory === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-muted-foreground hover:border-primary hover:text-primary"}`}>
              {cat}
            </button>))}
        </div>
      </section>

      {/* All Posts Grid */}
      <section className="container mx-auto py-10">
        {filtered.length === 0 ? (<div className="py-20 text-center text-muted-foreground">No articles found matching your search.</div>) : (<div className="grid grid-cols-2 gap-3 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post, i) => (<motion.article key={post.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="group overflow-hidden rounded-2xl border border-border bg-card flex flex-col">
                <div className="relative h-48 overflow-hidden">
                  <img src={post.image} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"/>
                  <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${categoryColors[post.category] || "bg-primary/20 text-primary"}`}>
                    {post.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display mb-2 text-base font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3"/>{post.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>{post.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{post.readTime}</span>
                  </div>
                </div>
              </motion.article>))}
          </div>)}
      </section>

      <section className="container mx-auto py-16">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl border border-border bg-card p-10 text-center">
          <h2 className="font-display mb-4 text-3xl font-bold">Have a question?</h2>
          <p className="mx-auto mb-6 max-w-2xl text-muted-foreground">
            Want to talk to our event experts? Reach out for tailored advice, custom packages, and support for your next event.
          </p>
          <Link to="/contact">
            <Button className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Contact Us
            </Button>
          </Link>
        </motion.div>
      </section>

    </Layout>);
};
export default Blog;
