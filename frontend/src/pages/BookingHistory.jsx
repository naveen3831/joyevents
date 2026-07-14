import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, AlertCircle, Loader2, Ticket, Clock, MapPin, User, History as HistoryIcon } from "lucide-react";
import CustomerLayout from "@/components/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiMyBookings } from "@/lib/api";
const STATUS_BADGE = {
    pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    assigned: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    confirmed: "bg-green-500/15 text-green-400 border border-green-500/30",
    completed: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    cancelled: "bg-red-500/15 text-red-400 border border-red-500/30",
};
const BookingHistory = () => {
    const { token } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const loadBookings = async () => {
            if (!token)
                return;
            try {
                const res = await apiMyBookings(token);
                // Filter only completed bookings for history and sort descending
                const completedBookings = (res.bookings || []).filter((b) => b.status === "completed")
                    .sort((a, b) => {
                    const dateA = new Date(a.createdAt || a.datetime || 0).getTime();
                    const dateB = new Date(b.createdAt || b.datetime || 0).getTime();
                    return dateB - dateA;
                });
                setBookings(completedBookings);
            }
            catch (error) {
            }
            finally {
                setLoading(false);
            }
        };
        loadBookings();
    }, [token]);
    return (<CustomerLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <div className="container mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <Link to="/customer-dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2"/> Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <HistoryIcon className="h-5 w-5"/>
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">
                  Booking <span className="text-gradient">History</span>
                </h1>
                <p className="text-muted-foreground text-sm">View your completed bookings and past experiences</p>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
            {loading ? (<div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin"/> Loading history…
              </div>) : bookings.length === 0 ? (<div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 opacity-40"/>
                <p className="font-medium text-lg">No booking history yet</p>
                <p className="text-sm mt-2">Your completed bookings will appear here</p>
              </div>) : (<div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookings.map((booking, index) => (<motion.div key={booking._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-2 sm:p-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-primary"/>
                          <span className="font-semibold text-[11px] sm:text-sm line-clamp-1">
                            {booking.event?.title || booking.serviceName}
                          </span>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[booking.status]}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                      {/* Date & Time */}
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0"/>
                        <div className="text-[11px] sm:text-sm"><div className="font-medium">{new Date(booking.datetime).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(booking.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      {booking.event?.location && (<div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0"/>
                          <div className="text-[11px] sm:text-sm"><div className="font-medium">{booking.event.location}</div>
                            <button onClick={() => {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.event.location)}`;
                        window.open(mapsUrl, '_blank');
                    }} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
                              Get Directions
                            </button>
                          </div>
                        </div>)}

                      {/* Merchant */}
                      {booking.assignedTo && (<div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-primary mt-0.5 shrink-0"/>
                          <div className="text-[11px] sm:text-sm"><div className="font-medium">{booking.assignedTo.name}</div>
                            <div className="text-xs text-muted-foreground">{booking.assignedTo.email}</div>
                          </div>
                        </div>)}

                      {/* Price */}
                      <div className="pt-3 border-t border-border">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Price Paid</span>
                          <span className="font-semibold text-primary">{formatCurrency(booking.price)}</span>
                        </div>
                      </div>

                      {/* Booked On */}
                      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
                        Booked on {new Date(booking.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </motion.div>))}
              </div>)}
          </motion.div>
        </div>
      </section>
    </CustomerLayout>);
};
export default BookingHistory;
