import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Ticket, Tag, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import MerchantLayout from "@/components/MerchantLayout";
import { Button } from "@/components/ui/button";
import { apiGetEventById } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { formatCurrency, formatEventSchedule, formatTime12 } from "@/lib/utils";
import { toast } from "sonner";

const imgSrc = (image) =>
  !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const StatusBadge = ({ status }) => {
  const cls =
    status === "upcoming"
      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
      : status === "ongoing"
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : "bg-gray-500/15 text-gray-400 border-gray-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
};

const TIER_STYLE = {
  diamond: {
    emoji: "💎",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    label: "text-cyan-300 font-bold",
    price: "text-cyan-400",
    badge: "bg-cyan-500/20 text-cyan-300",
  },
  gold: {
    emoji: "🥇",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    label: "text-yellow-300 font-bold",
    price: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  silver: {
    emoji: "🥈",
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
    label: "text-slate-300 font-bold",
    price: "text-slate-300",
    badge: "bg-slate-400/20 text-slate-300",
  },
};

const getTierStyle = (type) =>
  TIER_STYLE[type?.toLowerCase()] || {
    emoji: "🎫",
    bg: "bg-primary/10",
    border: "border-primary/30",
    label: "text-primary font-bold",
    price: "text-primary",
    badge: "bg-primary/20 text-primary",
  };

const MerchantEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await apiGetEventById(id);
        setEvent(res.event);
      } catch (err) {
        toast.error(err?.message || "Failed to load event details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Collect all ticket tiers across sessions
  const collectTickets = (ev) => {
    if (!ev) return [];
    if (ev.eventType !== "ticketed") return [];
    const map = {};
    const merge = (t) => {
      const key = t.type?.toLowerCase() || "general";
      if (!map[key]) {
        map[key] = { type: t.type, price: t.price || 0, available: 0, sold: 0 };
      }
      map[key].available += t.available || 0;
      map[key].sold += t.sold || 0;
    };
    if (ev.hasMultipleSessions && ev.sessions) {
      ["day", "night"].forEach((s) => {
        if (ev.sessions[s]?.enabled && ev.sessions[s]?.tickets) {
          ev.sessions[s].tickets.forEach(merge);
        }
      });
    } else if (ev.tickets?.length) {
      ev.tickets.forEach(merge);
    }
    return Object.values(map);
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading event details…
        </div>
      </MerchantLayout>
    );
  }

  if (!event) {
    return (
      <MerchantLayout>
        <div className="py-24 text-center">
          <p className="text-muted-foreground mb-4">Event not found.</p>
          <Button variant="outline" onClick={() => navigate("/merchant-dashboard/events")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Events
          </Button>
        </div>
      </MerchantLayout>
    );
  }

  const tickets = collectTickets(event);
  const totalSold = tickets.reduce((s, t) => s + t.sold, 0);
  const totalCapacity = tickets.reduce((s, t) => s + t.available, 0);

  const schedule = formatEventSchedule(event);

  const priceLabel = (() => {
    if (event.eventType !== "ticketed") return formatCurrency(event.price || 0);
    const prices = tickets.map((t) => t.price).filter((p) => p > 0);
    if (!prices.length) return "Free";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
  })();

  return (
    <MerchantLayout>
      <section className="py-6 px-4 sm:px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Back + Edit Row */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/merchant-dashboard/events")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Events
          </button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => navigate(`/merchant-dashboard/events/${id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit Event
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border bg-card overflow-hidden shadow-card"
        >
          {/* Cover image */}
          <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-secondary">
            {event.image ? (
              <img
                src={imgSrc(event.image)}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/30 text-6xl">
                📅
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 flex-wrap">
              {event.category && (
                <span className="rounded-full bg-gradient-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  {event.category}
                </span>
              )}
              <StatusBadge status={event.status} />
            </div>
          </div>

          {/* Details body */}
          <div className="p-6 space-y-6">
            {/* Title + price */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
                {event.title}
              </h1>
              <span className="shrink-0 text-xl font-bold text-primary">{priceLabel}</span>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
              {schedule.dateText && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 font-medium text-foreground">
                      <span>{schedule.dateText}</span>
                      {schedule.isMultiDay && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                          {schedule.badgeText}
                        </span>
                      )}
                    </div>
                    {schedule.isMultiDay && schedule.lastDateText && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">🏁 Last Date:</span> {schedule.lastDateText}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {schedule.timeText && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span>{schedule.timeText}</span>
                </div>
              )}
              {schedule.hasCustomSchedule && schedule.dailySchedule?.length > 0 && (
                <div className="sm:col-span-2 rounded-xl border border-border bg-muted/40 p-3 space-y-1.5 text-xs">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Daily Schedule Breakdown
                  </p>
                  <div className="space-y-1 text-muted-foreground">
                    {schedule.dailySchedule.map((day) => (
                      <div key={day.date} className="flex justify-between items-center py-0.5">
                        <span className="font-medium text-foreground">{day.dayLabel}</span>
                        <span>{formatTime12(day.startTime)} – {formatTime12(day.endTime)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                  About this event
                </h2>
                <p className="text-sm leading-relaxed text-foreground/80">{event.description}</p>
              </div>
            )}

            {/* ── Ticketed: summary + breakdown ─── */}
            {event.eventType === "ticketed" && tickets.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-4">
                {/* Summary row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Ticket className="h-4 w-4 text-primary" />
                    Tickets Booked
                  </div>
                  <div className="flex items-center gap-1 text-base font-bold">
                    <span className="text-primary">{totalSold}</span>
                    <span className="text-muted-foreground font-normal text-sm">/ {totalCapacity}</span>
                    {totalSold >= totalCapacity && totalCapacity > 0 && (
                      <span className="ml-2 text-xs text-red-500 font-semibold">SOLD OUT</span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {totalCapacity > 0 && (
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-primary transition-all"
                      style={{ width: `${Math.min(100, Math.round((totalSold / totalCapacity) * 100))}%` }}
                    />
                  </div>
                )}

                {/* Per-tier breakdown */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Ticket Breakdown
                  </h3>
                  <div className="space-y-2">
                    {tickets.map((t) => {
                      const remaining = t.available - t.sold;
                      const s = getTierStyle(t.type);
                      return (
                        <div
                          key={t.type}
                          className={`flex items-center justify-between rounded-xl border-2 ${s.border} ${s.bg} px-4 py-3`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{s.emoji}</span>
                            <div>
                              <p className={`text-sm capitalize ${s.label}`}>{t.type}</p>
                              <p className={`text-sm font-bold ${s.price}`}>{formatCurrency(t.price)}</p>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-bold">
                              <span className="text-primary">{t.sold}</span>
                              <span className="text-muted-foreground font-normal"> / {t.available}</span>
                            </p>
                            <p className={`text-xs font-semibold ${remaining <= 0 ? "text-red-500" : "text-green-500"}`}>
                              {remaining <= 0 ? "Sold Out" : `${remaining} left`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Full-service: attendees ─── */}
            {event.eventType === "fullService" && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-4">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Attendees</p>
                  <p className="text-base font-bold">
                    <span className="text-primary">{event.attendeesCount || 0}</span>
                    {event.maxAttendees > 0 && (
                      <span className="text-muted-foreground font-normal text-sm"> / {event.maxAttendees}</span>
                    )}
                    {event.maxAttendees > 0 && event.attendeesCount >= event.maxAttendees && (
                      <span className="ml-2 text-xs text-red-500 font-semibold">FULL</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Tags / extra info */}
            {event.tags?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {event.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </section>
    </MerchantLayout>
  );
};

export default MerchantEventDetail;
