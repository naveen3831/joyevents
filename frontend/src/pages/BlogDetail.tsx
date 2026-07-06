import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, User, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BLOG_POSTS, categoryColors, imgSrc } from "@/data/blogPosts";

const BlogDetail = () => {
  const { id } = useParams();
  const postId = Number(id);

  const post = useMemo(
    () => BLOG_POSTS.find((item) => item.id === postId),
    [postId]
  );

  if (!post) {
    return (
      <Layout>
        <section className="py-20 text-center">
          <div className="container mx-auto">
            <h1 className="font-display text-3xl font-bold">Article not found</h1>
            <p className="mt-4 text-muted-foreground">The article you were looking for does not exist.</p>
            <Link to="/blog">
              <Button className="mt-8 bg-primary text-primary-foreground hover:opacity-90">
                Back to Blog
              </Button>
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background py-24 pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Link to="/blog" className="inline-flex items-center gap-2 text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to Blog
              </Link>
            </div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              {post.category}
            </span>
            <h1 className="font-display mt-4 text-3xl font-bold leading-tight sm:text-5xl md:text-6xl">
              {post.title}
            </h1>
            <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><User className="h-4 w-4" />{post.author}</span>
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{post.date}</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" />{post.readTime}</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto py-16">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <article className="space-y-8">
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <img
                src={imgSrc(post.image)}
                alt={post.title}
                className="h-80 w-full object-cover"
              />
            </div>

            <div className="space-y-6 rounded-3xl border border-border bg-card p-8">
              <p className="text-lg leading-8 text-muted-foreground">
                {post.content}
              </p>
              <p className="text-lg leading-8 text-muted-foreground">
                {post.excerpt}
              </p>
            </div>
          </article>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold">Need help planning?</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Get in touch with our event specialists for custom advice and event support.
              </p>
              <Link to="/contact">
                <Button className="mt-6 w-full bg-primary text-primary-foreground hover:opacity-90">
                  Contact Us
                </Button>
              </Link>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6">
              <h3 className="font-semibold text-base">More articles</h3>
              <div className="mt-4 space-y-3">
                {BLOG_POSTS.filter((item) => item.id !== post.id).slice(0, 3).map((item) => (
                  <Link key={item.id} to={`/blog/${item.id}`} className="block rounded-2xl border border-border bg-secondary/70 p-3 transition-colors hover:border-primary/50 hover:bg-primary/10">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.category}</div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
};

export default BlogDetail;
