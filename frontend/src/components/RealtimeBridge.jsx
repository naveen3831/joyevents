import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { createRealtimeClient } from "@/lib/realtime";
import { toast } from "sonner";

const RESOURCE_QUERY_KEYS = {
  analytics: ["analytics"],
  auth: ["user", "users"],
  bookings: ["bookings"],
  categories: ["categories"],
  contact: ["messages", "inbox"],
  earnings: ["earnings", "withdrawals", "transactions"],
  events: ["events"],
  favorites: ["favorites"],
  marketing: ["marketing", "promoCodes"],
  merchant: ["merchant"],
  notifications: ["notifications"],
  recommendations: ["recommendations"],
  referrals: ["referrals"],
  services: ["services"],
  settings: ["settings"],
};

function dispatchRealtimeEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export default function RealtimeBridge() {
  const { token, isLoggedIn, user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token || !isLoggedIn) return undefined;

    const client = createRealtimeClient(token, {
      onMessage(msg) {
        dispatchRealtimeEvent("realtime:raw-message", msg);

        if (!msg || !msg.type) return;

        // 1. Realtime Notifications
        if (msg.type === "notification:created") {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          dispatchRealtimeEvent("realtime:notification", msg.notification);
          
          if (msg.notification?.title) {
            toast.info(msg.notification.title, {
              description: msg.notification.message || "New update received",
            });
          }
          return;
        }

        // 2. Realtime Chat Messages
        if (msg.type === "message:created" || msg.type === "message:reply") {
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["inbox"] });
          dispatchRealtimeEvent("realtime:chat-message", msg);

          if (msg.type === "message:created") {
            toast.message("💬 New Enquiry Received", {
              description: msg.message?.itemTitle ? `About "${msg.message.itemTitle}"` : "You have a new message",
            });
          } else if (msg.type === "message:reply") {
            toast.message("💬 New Reply Received", {
              description: msg.reply?.text || "Organiser replied to your message",
            });
          }
          return;
        }

        // 3. Realtime Booking Updates
        if (msg.type === "booking:created" || msg.type === "booking:updated") {
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
          dispatchRealtimeEvent("realtime:booking-update", msg);

          if (msg.type === "booking:created") {
            toast.success("🎟️ New Booking Received!", {
              description: `Booking ID: #${msg.booking?._id?.slice(-6) || ""}`,
            });
          } else if (msg.type === "booking:updated") {
            toast.info("Booking Status Updated", {
              description: `Status is now ${msg.booking?.status || "updated"}`,
            });
          }
          return;
        }

        // 4. Realtime Ticket Inventory Updates
        if (msg.type === "event:tickets_updated") {
          queryClient.invalidateQueries({ queryKey: ["events"] });
          dispatchRealtimeEvent("realtime:tickets-updated", msg);
          return;
        }

        // 5. Realtime Ticket Scanning
        if (msg.type === "ticket:scanned") {
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
          dispatchRealtimeEvent("realtime:ticket-scanned", msg);
          toast.success("Ticket Check-in Validated!");
          return;
        }

        // 6. Custom Service Enquiry Realtime Updates
        if (msg.type?.startsWith("custom_service:")) {
          queryClient.invalidateQueries({ queryKey: ["custom-service-requests"] });
          dispatchRealtimeEvent("realtime:custom-service-update", msg);

          if (msg.type === "custom_service:created") {
            toast.info("🛎️ New Custom Service Enquiry", {
              description: `"${msg.request?.serviceTitle || 'Service'}" requested by ${msg.request?.user?.name || 'Customer'}`
            });
          } else if (msg.type === "custom_service:quoted") {
            toast.success("💰 Quotation Received!", {
              description: `Admin sent quote for "${msg.request?.serviceTitle || 'Service'}"`
            });
          } else if (msg.type === "custom_service:rejected") {
            toast.error("❌ Service Request Update", {
              description: `"${msg.request?.serviceTitle || 'Service'}" enquiry was declined.`
            });
          } else if (msg.type === "custom_service:paid") {
            toast.success("✅ Custom Service Payment Received!", {
              description: `Quote accepted for "${msg.request?.serviceTitle || 'Service'}"`
            });
          }
          return;
        }

        // 6.5. Realtime Wallet Updates
        if (msg.type === "wallet:updated" || msg.type === "user:updated") {
          queryClient.invalidateQueries({ queryKey: ["user"] });
          dispatchRealtimeEvent("realtime:wallet-updated", msg);
          dispatchRealtimeEvent("realtime:resource-changed", { resource: "auth", ...msg });
          dispatchRealtimeEvent("realtime:resource-changed", { resource: "wallet", ...msg });
          if (msg.walletBalance !== undefined) {
            toast.info(`💰 Wallet Balance Updated: ₹${msg.walletBalance}`);
          }
          return;
        }

        // 7. Generic Resource Changed fallback
        if (msg.type === "resource:changed") {
          const keys = RESOURCE_QUERY_KEYS[msg.resource] || [msg.resource];
          keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
          dispatchRealtimeEvent("realtime:resource-changed", msg);
        }
      },
    });

    return () => client.close();
  }, [isLoggedIn, queryClient, token, user]);

  return null;
}
