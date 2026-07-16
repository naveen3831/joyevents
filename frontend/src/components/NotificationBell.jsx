import { useState, useEffect } from "react";
import { Bell, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { apiGetNotifications, apiMarkNotificationAsRead, apiMarkAllNotificationsAsRead, apiDeleteNotification } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
const NotificationBell = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const resolvePath = (url) => {
        if (!url)
            return "/";
        // Map legacy URLs to modern nested dashboard URLs
        if (url === "/my-requests")
            return "/customer-dashboard/bookings";
        if (url === "/merchant-bookings")
            return "/merchant-dashboard/bookings";
        if (url === "/merchant-earnings")
            return "/merchant-dashboard/earnings";
        if (url === "/merchant-marketing")
            return "/merchant-dashboard/marketing";
        return url;
    };
    const handleNotificationClick = (notification) => {
        if (notification.status === "unread") {
            handleMarkAsRead(notification._id);
        }
        setIsOpen(false);
        if (notification.actionUrl) {
            navigate(resolvePath(notification.actionUrl));
        }
    };
    // Load unread count on mount and poll every 30s
    useEffect(() => {
        if (!token)
            return;
        const fetchCount = async () => {
            try {
                const data = await apiGetNotifications(token, { limit: 1 });
                setUnreadCount(data.unreadCount || 0);
            }
            catch { }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [token]);
    // Full load when dropdown opens
    useEffect(() => {
        if (isOpen && token) {
            loadNotifications();
        }
    }, [isOpen, token]);
    const loadNotifications = async () => {
        if (!token)
            return;
        try {
            setLoading(true);
            const data = await apiGetNotifications(token, { limit: 10 });
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        }
        catch (error) {
        }
        finally {
            setLoading(false);
        }
    };
    const handleMarkAsRead = async (id) => {
        if (!token)
            return;
        try {
            await apiMarkNotificationAsRead(id, token);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: "read" } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        catch (error) {
        }
    };
    const handleMarkAllAsRead = async () => {
        if (!token)
            return;
        try {
            await apiMarkAllNotificationsAsRead(token);
            setNotifications(prev => prev.map(n => ({ ...n, status: "read" })));
            setUnreadCount(0);
        }
        catch (error) {
        }
    };
    const handleDelete = async (id) => {
        if (!token)
            return;
        try {
            await apiDeleteNotification(id, token);
            setNotifications(prev => prev.filter(n => n._id !== id));
        }
        catch (error) {
        }
    };
    return (<div className="relative inline-block">
        <Button variant="ghost" onClick={() => setIsOpen(!isOpen)} className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all relative shrink-0 shadow-sm ${isOpen ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow" : "bg-secondary/50 border-border/40 hover:bg-secondary hover:border-border/80 text-foreground/80 hover:text-foreground"}`} title="Notifications">
          <Bell className={`h-5 w-5 transition-colors ${isOpen ? "text-primary-foreground" : unreadCount > 0 ? "text-primary" : ""}`}/>
          {unreadCount > 0 && (<>
              <span className={`absolute -top-1 -right-1 flex h-4.5 min-w-[1.125rem] px-1 items-center justify-center rounded-full text-[8px] font-bold shadow-glow border border-background z-10 ${isOpen ? "bg-background text-primary" : "bg-red-500 text-white"}`}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
              <span className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-red-400 animate-ping opacity-60 pointer-events-none"/>
            </>)}
        </Button>
      
      <AnimatePresence>
        {isOpen && (<>
            {/* Backdrop to close the dropdown when clicking outside */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}/>
            
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 mt-2 w-80 max-h-[520px] overflow-y-auto bg-card text-card-foreground border border-border rounded-xl shadow-elevated z-50 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary"/>
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (<span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>)}
                </div>
                {unreadCount > 0 && (<Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-7 text-xs text-primary">
                    Mark all read
                  </Button>)}
              </div>

              <div className="flex-1">
                {loading ? (<div className="p-6 text-center text-sm text-muted-foreground">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"/>
                    Loading…
                  </div>) : notifications.length === 0 ? (<div className="p-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2"/>
                    <p className="text-sm text-muted-foreground">You're all caught up!</p>
                  </div>) : (notifications.map((notification) => (<motion.div key={notification._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className={`px-4 py-3 border-b last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer ${notification.status === "unread" ? "bg-primary/5 border-l-2 border-l-primary" : ""}`} onClick={() => handleNotificationClick(notification)}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {notification.status === "unread"
                      ? <span className="block h-2 w-2 rounded-full bg-primary mt-1.5"/>
                      : <span className="block h-2 w-2 rounded-full bg-muted-foreground/30 mt-1.5"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${notification.status === "unread" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                              {notification.title}
                            </p>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(notification._id); }} className="shrink-0 text-muted-foreground/50 hover:text-red-500 transition-colors p-0.5">
                              <Trash2 className="h-3 w-3"/>
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </motion.div>)))}
              </div>
            </motion.div>
          </>)}
      </AnimatePresence>
    </div>);
};
export default NotificationBell;
