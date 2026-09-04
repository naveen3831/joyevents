import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ImageIcon,
  Loader2,
  AlertCircle,
  Ticket,
  MapPin,
  CalendarDays,
  Store,
  Mail,
  Phone,
  Tag,
  Users2,
  ArrowLeft,
  Pencil,
  Activity,
  IndianRupee,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/table/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatEventSchedule } from "@/lib/utils";
import { apiGetEventById } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { toast } from "sonner";

const imgSrc = (image) =>
  !image ? "" : image.startsWith("http") ? image : `${API_URL}${image}`;

const getEventTickets = (ev) =>
  ev.hasMultipleSessions
    ? [...(ev.sessions?.day?.tickets || []), ...(ev.sessions?.night?.tickets || [])]
    : ev.tickets || [];

const getEventPriceLabel = (ev) => {
  if (ev.eventType !== "ticketed") return formatCurrency(ev.price);
  const prices = getEventTickets(ev)
    .map((t) => t.price)
    .filter((p) => p > 0);
  if (prices.length === 0) return "Free";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

const AdminEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetEventById(id)
      .then((res) => {
        if (!cancelled) setEvent(res.event || null);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load event");
          toast.error(e?.message || "Failed to load event");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <AdminLayout>
      <div className="w-full max-w-[1150px] mx-auto space-y-5">
        {/* Page Header with Back and Edit Action */}
        <PageHeader
          title={event?.title || "Event Details"}
          subtitle="View and manage event specifications, ticketing, and organizer details."
          breadcrumbs={[
            { label: "Admin Portal", to: "/admin-dashboard" },
            { label: "Events", to: "/admin-dashboard/events" },
            { label: event?.title ? event.title : "Event Details" },
          ]}
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin-dashboard/events")}
                className="h-9 text-xs font-semibold rounded-lg gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Events
              </Button>
              {event && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/admin-dashboard/events/${id}/edit`)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold h-9 px-4 gap-1.5 shadow-sm"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Event
                </Button>
              )}
            </div>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading event details...
          </div>
        ) : error || !event ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40 text-destructive" />
            <p className="text-sm font-semibold text-foreground">{error || "Event not found."}</p>
            <div className="mt-4">
              <Link
                to="/admin-dashboard/events"
                className="text-primary text-xs font-semibold hover:underline"
              >
                Return to All Events
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Compact Hero Banner Section */}
            <div className="relative h-64 sm:h-72 lg:h-[300px] w-full rounded-2xl overflow-hidden bg-secondary border border-border/80 shadow-sm">
              {imgSrc(event.image) ? (
                <img
                  src={imgSrc(event.image)}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted text-muted-foreground/30">
                  <ImageIcon className="h-14 w-14 opacity-30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

              {/* Status Badge Overlay */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {event.live && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-md">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    LIVE STREAM
                  </span>
                )}
                <StatusBadge status={event.status} className="shadow-md" />
              </div>

              {/* Title & Category Overlay */}
              <div className="absolute bottom-4 left-5 right-5 space-y-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 text-primary-foreground px-3 py-0.5 text-xs font-bold shadow-sm">
                  <Tag className="h-3 w-3" /> {event.category || "General"}
                </span>
                <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight truncate">
                  {event.title}
                </h1>
              </div>
            </div>

            {/* Compact Organizer Info Card */}
            <div className="rounded-xl border border-border/80 bg-card p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Organized By
                  </span>
                  <p className="font-semibold text-sm text-foreground">
                    {event.createdBy?.name || "Merchant Partner"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                {event.createdBy?.email && (
                  <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{" "}
                    {event.createdBy.email}
                  </span>
                )}
                {event.createdBy?.mobile && (
                  <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{" "}
                    {event.createdBy.mobile}
                  </span>
                )}
              </div>
            </div>

            {/* Event Description Card */}
            {event.description && (
              <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </h3>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}

            {/* Compact 2-Column Responsive Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location Card */}
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Location
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-foreground mt-0.5 truncate">
                    {event.location}
                  </p>
                </div>
              </div>

              {/* Date & Time Card */}
              {(() => {
                const schedule = formatEventSchedule(event);
                return (
                  <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Date & Time
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <p className="text-xs sm:text-sm font-semibold text-foreground">
                          {schedule.dateText || new Date(event.datetime).toLocaleDateString()}
                        </p>
                        {schedule.isMultiDay && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            {schedule.badgeText}
                          </span>
                        )}
                      </div>
                      {schedule.timeText && (
                        <p className="text-xs text-muted-foreground mt-0.5">{schedule.timeText}</p>
                      )}
                      {schedule.isMultiDay && schedule.lastDateText && (
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                          <span className="font-semibold text-purple-600 dark:text-purple-400">🏁 Last Date:</span> {schedule.lastDateText}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Price / Pricing Card */}
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                  <IndianRupee className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Pricing
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-primary mt-0.5">
                    {getEventPriceLabel(event)}
                  </p>
                </div>
              </div>

              {/* Capacity & Attendees Card */}
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                  <Users2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Capacity & Attendees
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">
                    {event.maxAttendees && event.maxAttendees > 0
                      ? `${event.attendeesCount || 0} / ${event.maxAttendees} attendees`
                      : `${event.attendeesCount || 0} registered (Unlimited)`}
                  </p>
                </div>
              </div>
            </div>

            {/* Ticket Tiers Section (if ticketed event) */}
            {getEventTickets(event).length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Ticket Tiers & Availability
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getEventTickets(event).map((ticket, idx) => {
                    const remaining = (ticket.available || 0) - (ticket.sold || 0);
                    const isSoldOut = remaining <= 0;
                    return (
                      <div
                        key={`${ticket.type}-${idx}`}
                        className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3.5 py-2.5 text-xs"
                      >
                        <div>
                          <span className="capitalize font-semibold text-foreground block">
                            {ticket.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {ticket.sold || 0} sold
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-primary font-bold block">
                            {formatCurrency(ticket.price)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              isSoldOut ? "text-rose-500" : "text-emerald-500"
                            }`}
                          >
                            {isSoldOut ? "Sold Out" : `${remaining} available`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEventDetail;
