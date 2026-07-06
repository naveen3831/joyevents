import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote, Calendar, Loader2, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { apiGetPublicReviews } from "@/lib/api";
import { API_URL } from "@/lib/config";

const imgSrc = (img: string) => !img ? "" : img.startsWith("http") ? img : `${API_URL}${img}`;

const StarRating = ({ score }: { score: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} className={`h-4 w-4 ${s <= score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

const Reviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "event" | "service">("all");
  const [selectedScore, setSelectedScore] = useState(0);

  useEffect(() => {
    apiGetPublicReviews()
      .then(d => setReviews(d.reviews || []))
      .catch((e) => { console.error("Reviews fetch error:", e); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = reviews.filter(r =>
    (filter === "all" || r.type === filter) &&
    (selectedScore === 0 || r.score === selectedScore)
  );

  const avgScore = reviews.length
    ? (reviews.reduce((s, r) => s + r.score, 0) / reviews.length).toFixed(1)
    : "—";
  const fiveStars = reviews.filter(r => r.score === 5).length;
  const eventReviews = reviews.filter(r => r.type === "event").length;
  const serviceReviews = reviews.filter(r => r.type === "service").length;

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-orange-500/5" />
        <div className="container mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Star className="h-4 w-4 fill-primary" /> Customer Reviews
            </span>
            <h1 className="font-display text-xl sm:text-4xl font-bold md:text-6xl mb-4">
              What Our <span className="text-gradient">Customers</span> Say
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Real experiences from real people. Every review is from a verified booking on JoyEvents — 
              helping you choose the perfect event or service with confidence.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Average Rating", value: avgScore, icon: "⭐" },
              { label: "Total Reviews", value: reviews.length, icon: "💬" },
              { label: "5-Star Reviews", value: fiveStars, icon: "🏆" },
              { label: "Events Reviewed", value: eventReviews, icon: "🎫" },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="font-display text-lg sm:text-2xl font-bold text-gradient">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-y border-border bg-secondary/20">
        <div className="container mx-auto flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
          {(["all", "event", "service"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors capitalize ${
                filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:border-primary/50"
              }`}>
              {f === "all" ? "All Reviews" : f === "event" ? `Events (${eventReviews})` : `Services (${serviceReviews})`}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rating:</span>
            <div className="flex gap-1">
              {[0, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setSelectedScore(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selectedScore === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:border-primary/50"
                  }`}>
                  {s === 0 ? "All" : `${s}★`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-16">
        <div className="container mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /> Loading reviews…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold">No reviews yet</p>
              <p className="text-sm mt-2">Be the first to book and share your experience!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((review, i) => (
                <motion.div key={review._id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors group">
                  {/* Service/Event image */}
                  {imgSrc(review.image) && (
                    <div className="relative h-36 overflow-hidden bg-secondary">
                      <img src={imgSrc(review.image)} alt={review.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-3 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          review.type === "event" ? "bg-primary/80 text-white" : "bg-orange-500/80 text-white"
                        }`}>
                          {review.type === "event" ? "🎫 Event" : "🛠️ Service"}
                        </span>
                        {review.category && (
                          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">{review.category}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    {/* Title */}
                    <h3 className="font-display font-semibold text-base mb-1 line-clamp-1">{review.title}</h3>

                    {/* Stars + score */}
                    <div className="flex items-center gap-2 mb-3">
                      <StarRating score={review.score} />
                      <span className="text-sm font-bold text-yellow-400">{review.score}/5</span>
                    </div>

                    {/* Comment */}
                    {review.comment ? (
                      <div className="relative">
                        <Quote className="absolute -top-1 -left-1 h-5 w-5 text-primary/20" />
                        <p className="text-sm text-muted-foreground leading-relaxed pl-4 line-clamp-3 italic">
                          "{review.comment}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No written review</p>
                    )}

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white">
                          {review.customerName?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium">{review.customerName}</span>
                      </div>
                      {review.ratedAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(review.ratedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto text-center max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-xl sm:text-3xl font-bold mb-4">Share Your Experience</h2>
            <p className="text-muted-foreground mb-6">
              Booked an event or service with us? Your review helps thousands of others make the right choice.
              Log in to your dashboard and rate your completed bookings.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="/events" className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                🎫 Browse Events
              </a>
              <a href="/services" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold hover:border-primary/50 transition-colors">
                🛠️ Browse Services
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Reviews;

