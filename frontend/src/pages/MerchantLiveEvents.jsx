import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Video, ToggleLeft, ToggleRight, AlertCircle, Calendar, MapPin, Users } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiListMyEvents, apiUpdateEventWithImage } from "@/lib/api";
import { API_URL } from "@/lib/config";
const MerchantLiveEvents = () => {
    const { token, user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        loadEvents();
    }, []);
    const loadEvents = async () => {
        try {
            const res = await apiListMyEvents(token);
            const merchantEvents = res.events || [];
            setEvents(merchantEvents);
        }
        catch (error) {
            toast.error("Failed to load events");
        }
        finally {
            setLoading(false);
        }
    };
    const toggleLive = async (event) => {
        try {
            const newLiveStatus = !event.live;
            const formData = new FormData();
            formData.append('live', newLiveStatus.toString());
            await apiUpdateEventWithImage(event._id, formData, token);
            // Update local state
            const updatedEvent = { ...event, live: newLiveStatus };
            setEvents(events.map(e => e._id === event._id ? updatedEvent : e));
            toast.success(`Event ${newLiveStatus ? "marked as" : "removed from"} Live`);
        }
        catch (error) {
            toast.error("Failed to update event status");
        }
    };
    return (<MerchantLayout>
      <section className="py-2 sm:py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-3xl font-bold flex items-center gap-2">
                <Video className="h-7 w-7 text-primary"/>
                Live <span className="text-gradient">Events</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your live streaming events - toggle live status for your own events
              </p>
            </div>
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0"/>
                <div className="space-y-1">
                  <p className="text-sm font-medium">About Live Events</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Mark YOUR events as "Live" to make them visible on the home page</li>
                    <li>• Live events are visible to admins and all customers</li>
                    <li>• Customers can browse and book live events</li>
                    <li>• Toggle the switch to mark your event as live or regular</li>
                    <li>• Only YOUR events are shown here</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Events Grid */}
        {loading ? (<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"/>
            Loading live events...
          </div>) : events.length === 0 ? (<Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-30"/>
              <p>No events found. Create your first event to get started! Only your events are shown here.</p>
            </CardContent>
          </Card>) : (<div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (<motion.div key={event._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Event Image */}
                  <div className="relative h-48 bg-secondary">
                    {event.image ? (<img src={event.image.startsWith("http") ? event.image : `${API_URL}${event.image}`} alt={event.title} className="h-full w-full object-cover"/>) : (<div className="flex h-full items-center justify-center text-muted-foreground">
                        <Calendar className="h-12 w-12 opacity-30"/>
                      </div>)}
                    
                    {/* Live Badge */}
                    {event.live && (<Badge className="absolute top-2 right-2 bg-red-500 hover:bg-red-600">
                        <Video className="h-3 w-3 mr-1"/>
                        LIVE
                      </Badge>)}
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-4">
                    <h3 className="font-display font-semibold text-lg mb-2 line-clamp-1">
                      {event.title}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3"/>
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3"/>
                        <span>{new Date(event.datetime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3"/>
                        <span>${event.price}</span>
                      </div>
                    </div>

                    {/* Live Toggle */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-sm font-medium">
                        {event.live ? "Live Event" : "Regular Event"}
                      </span>
                      <button onClick={() => toggleLive(event)} className="focus:outline-none" title={event.live ? "Remove from live" : "Mark as live"}>
                        {event.live ? (<ToggleRight className="h-8 w-8 text-green-500"/>) : (<ToggleLeft className="h-8 w-8 text-gray-400"/>)}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>))}
          </div>)}

        {/* Stats Summary */}
        {!loading && events.length > 0 && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{events.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Live Events</p>
                  <p className="text-2xl font-bold text-green-600">
                    {events.filter(e => e.live).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Regular Events</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {events.filter(e => !e.live).length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>)}
      </section>
    </MerchantLayout>);
};
export default MerchantLiveEvents;
