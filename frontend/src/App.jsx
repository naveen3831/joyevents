import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import ScrollToTop from "@/components/ScrollToTop";
import RealtimeBridge from "@/components/RealtimeBridge";
// Global fetch interceptor to handle account deactivation instantly
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const res = await originalFetch(...args);
    if (res.status === 403) {
        const clone = res.clone();
        try {
            const data = await clone.json();
            if (data?.error && (data.error.includes("deactivated") || data.error.includes("contact the administrator"))) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("role");
                sessionStorage.clear();
                window.location.href = "/login?error=deactivated";
            }
        }
        catch (e) {
            // Ignore parse errors
        }
    }
    return res;
};
// Eagerly import primary public pages for instant navbar navigation
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import ServiceDetail from "./pages/ServiceDetail";
import AboutUs from "./pages/AboutUs";
import Services from "./pages/Services";
import Portfolio from "./pages/Portfolio";
import Contact from "./pages/Contact";
import Reviews from "./pages/Reviews";
import Blog from "./pages/Blog";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const MerchantDashboard = lazy(() => import("./pages/MerchantDashboard"));
const MerchantUpgradeSlots = lazy(() => import("./pages/MerchantUpgradeSlots"));
const MerchantEvents = lazy(() => import("./pages/MerchantEvents"));
const MerchantEventDetail = lazy(() => import("./pages/MerchantEventDetail"));
const MerchantServices = lazy(() => import("./pages/MerchantServices"));
const MerchantLiveEvents = lazy(() => import("./pages/MerchantLiveEvents"));
const TicketValidation = lazy(() => import("./pages/TicketValidation"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminEarnings = lazy(() => import("./pages/admin/AdminEarnings"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminMerchantForm = lazy(() => import("./pages/admin/AdminMerchantForm"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"));
const AdminEventDetail = lazy(() => import("./pages/admin/AdminEventDetail"));
const AdminMyEvents = lazy(() => import("./pages/admin/AdminMyEvents"));
const AdminEventForm = lazy(() => import("./pages/admin/AdminEventForm"));
const AdminMetrics = lazy(() => import("./pages/admin/AdminMetrics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminServiceDetail = lazy(() => import("./pages/admin/AdminServiceDetail"));
const AdminMyServices = lazy(() => import("./pages/admin/AdminMyServices"));
const AdminServiceForm = lazy(() => import("./pages/admin/AdminServiceForm"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminEventMonitoring = lazy(() => import("./pages/admin/AdminEventMonitoring"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const AdminUtilities = lazy(() => import("./pages/admin/AdminUtilities"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminPaymentDetail = lazy(() => import("./pages/admin/AdminPaymentDetail"));
const AdminCommissions = lazy(() => import("./pages/admin/AdminCommissions"));
const AdminHomepageSettings = lazy(() => import("./pages/admin/AdminHomepageSettings"));
const AdminRefunds = lazy(() => import("./pages/admin/AdminRefunds"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminBookingDetail = lazy(() => import("./pages/admin/AdminBookingDetail"));
const MerchantProfile = lazy(() => import("./pages/MerchantProfile"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const MerchantSettings = lazy(() => import("./pages/MerchantSettings"));
const CustomerSettings = lazy(() => import("./pages/CustomerSettings"));
const CustomerMessages = lazy(() => import("./pages/CustomerMessages"));
const CustomerBrowseEvents = lazy(() => import("./pages/CustomerBrowseEvents"));
const CustomerBrowseServices = lazy(() => import("./pages/CustomerBrowseServices"));
const CustomerEventDetail = lazy(() => import("./pages/CustomerEventDetail"));
const CustomerServiceDetail = lazy(() => import("./pages/CustomerServiceDetail"));
const MyRequests = lazy(() => import("./pages/MyRequests"));
const MerchantBookings = lazy(() => import("./pages/MerchantBookings"));
const MerchantInbox = lazy(() => import("./pages/MerchantInbox"));
const EarningsDashboard = lazy(() => import("./pages/EarningsDashboard"));
const RequestWithdrawal = lazy(() => import("./pages/RequestWithdrawal"));
const MarketingTools = lazy(() => import("./pages/MarketingTools"));
const EventAnalytics = lazy(() => import("./pages/EventAnalytics"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const UpcomingBookings = lazy(() => import("./pages/UpcomingBookings"));
const Favorites = lazy(() => import("./pages/Favorites"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const QRCodeGenerator = lazy(() => import("./pages/QRCodeGenerator"));
const AIRecommendations = lazy(() => import("./pages/AIRecommendations"));
const RequestCustomServicePage = lazy(() => import("./pages/RequestCustomServicePage"));
const MerchantRecommendations = lazy(() => import("./pages/MerchantRecommendations"));
const AdminRecommendations = lazy(() => import("./pages/admin/AdminRecommendations"));
const Cart = lazy(() => import("./pages/Cart"));
const ContactOrganiserPage = lazy(() => import("./pages/ContactOrganiserPage"));
const CustomerWallet = lazy(() => import("./pages/CustomerWallet"));
const CustomerReferral = lazy(() => import("./pages/CustomerReferral"));
const MerchantReferrals = lazy(() => import("./pages/MerchantReferrals"));
const AdminReferrals = lazy(() => import("./pages/admin/AdminReferrals"));
const AdminRatings = lazy(() => import("./pages/admin/AdminRatings"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const NotFound = lazy(() => import("./pages/NotFound"));
const queryClient = new QueryClient();
// Loading component
const PageLoader = () => {
  return (<div className="flex flex-col items-center justify-center min-h-screen bg-gradient-dark relative overflow-hidden">
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px] pointer-events-none animate-pulse duration-[4000ms]"/>
      
      {/* Top Loading Progress Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary overflow-hidden">
        <motion.div className="h-full bg-gradient-primary" initial={{ width: "0%", left: "0%" }} animate={{ 
            width: ["25%", "50%", "25%"],
            left: ["0%", "50%", "100%"]
        }} transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
        }} style={{ position: 'absolute' }}/>
      </div>

      <div className="flex flex-col items-center gap-6 relative z-10">
        {/* Pulsing logo icon */}
        <motion.div animate={{
            scale: [1, 1.08, 1],
            rotate: [0, 5, -5, 0]
        }} transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
        }} className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow text-white text-3xl font-bold">
          📅
        </motion.div>
        
        {/* Animated Text */}
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-gradient tracking-wide animate-pulse">
            Loading Eventoza
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium tracking-widest uppercase opacity-75">
            Preparing your experience
          </p>
        </div>
      </div>
    </div>);
};
const AppRoutes = () => {
    return (<Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PublicRoute><Index /></PublicRoute>}/>
        <Route path="/about" element={<PublicRoute><AboutUs /></PublicRoute>}/>
        <Route path="/services" element={<PublicRoute><Services /></PublicRoute>}/>
        <Route path="/portfolio" element={<PublicRoute><Portfolio /></PublicRoute>}/>
        <Route path="/contact" element={<PublicRoute><Contact /></PublicRoute>}/>
        <Route path="/blog" element={<PublicRoute><Blog /></PublicRoute>}/>
        <Route path="/blog/:id" element={<PublicRoute><BlogDetail /></PublicRoute>}/>
        <Route path="/reviews" element={<PublicRoute><Reviews /></PublicRoute>}/>
        <Route path="/events" element={<PublicRoute><Events /></PublicRoute>}/>
        <Route path="/events/:id" element={<PublicRoute><EventDetail /></PublicRoute>}/>
        <Route path="/services/:id" element={<PublicRoute><ServiceDetail /></PublicRoute>}/>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>}/>
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>}/>
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>}/>
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>}/>
        
        {/* Dashboard root redirects */}
        <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={["customer"]}><UserDashboard /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantDashboard /></ProtectedRoute>}/>
        <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOverview /></ProtectedRoute>}/>
        
        {/* Legacy redirect */}
        <Route path="/user-dashboard" element={<Navigate to="/customer-dashboard" replace/>}/>
        
        {/* Customer Routes */}
        <Route path="/customer-dashboard/bookings" element={<ProtectedRoute allowedRoles={["customer"]}><MyRequests /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/history" element={<ProtectedRoute allowedRoles={["customer"]}><BookingHistory /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/upcoming" element={<ProtectedRoute allowedRoles={["customer"]}><UpcomingBookings /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/messages" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerMessages /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/browse-events" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerBrowseEvents /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/browse-services" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerBrowseServices /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/events/:id" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerEventDetail /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/services/:id" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerServiceDetail /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/favorites" element={<ProtectedRoute allowedRoles={["customer"]}><Favorites /></ProtectedRoute>}/>
        <Route path="/favorites" element={<ProtectedRoute allowedRoles={["customer"]}><Favorites /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/settings" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerSettings /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/profile" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerProfile /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/ai-recommendations" element={<ProtectedRoute allowedRoles={["customer"]}><AIRecommendations /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/cart" element={<ProtectedRoute allowedRoles={["customer"]}><Cart /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/wallet" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerWallet /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/referral" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerReferral /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/request-custom-service" element={<ProtectedRoute allowedRoles={["customer"]}><RequestCustomServicePage /></ProtectedRoute>}/>
        <Route path="/customer-dashboard/contact-organiser" element={<ProtectedRoute allowedRoles={["customer"]}><ContactOrganiserPage /></ProtectedRoute>}/>
        <Route path="/request-custom-service" element={<ProtectedRoute allowedRoles={["customer"]}><RequestCustomServicePage /></ProtectedRoute>}/>
        
        {/* Merchant Routes */}
        <Route path="/merchant-dashboard/events" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantEvents /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/events/new" element={<ProtectedRoute allowedRoles={["merchant"]}><CreateEvent /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/events/:id/edit" element={<ProtectedRoute allowedRoles={["merchant"]}><AdminEventForm layout="merchant" /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/events/:id" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantEventDetail /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/create-event" element={<ProtectedRoute allowedRoles={["merchant"]}><CreateEvent /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/live-events" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantLiveEvents /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/services" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantServices /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/services/new" element={<ProtectedRoute allowedRoles={["merchant"]}><AdminServiceForm layout="merchant" /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/services/:id/edit" element={<ProtectedRoute allowedRoles={["merchant"]}><AdminServiceForm layout="merchant" /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/create-service" element={<ProtectedRoute allowedRoles={["merchant"]}><AdminServiceForm layout="merchant" /></ProtectedRoute>}/>
        <Route path="/create-service" element={<ProtectedRoute allowedRoles={["merchant"]}><AdminServiceForm layout="merchant" /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/profile" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantProfile /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/ticket-validation" element={<ProtectedRoute allowedRoles={["merchant"]}><TicketValidation /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/analytics" element={<ProtectedRoute allowedRoles={["merchant"]}><EventAnalytics /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/inbox" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantInbox /></ProtectedRoute>}/>
        {/* Sidebar-aligned merchant routes */}
        <Route path="/merchant-dashboard/bookings" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantBookings /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/earnings" element={<ProtectedRoute allowedRoles={["merchant"]}><EarningsDashboard /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/withdraw" element={<ProtectedRoute allowedRoles={["merchant"]}><RequestWithdrawal /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/marketing" element={<ProtectedRoute allowedRoles={["merchant"]}><MarketingTools /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/referrals" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantReferrals /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/qr-codes" element={<ProtectedRoute allowedRoles={["merchant"]}><QRCodeGenerator /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/settings" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantSettings /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/upgrade-slots" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantUpgradeSlots /></ProtectedRoute>}/>
        <Route path="/merchant-dashboard/ai-recommendations" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantRecommendations /></ProtectedRoute>}/>
        {/* Legacy merchant routes (kept for backwards compat) */}
        <Route path="/merchant-settings" element={<ProtectedRoute allowedRoles={["merchant", "admin"]}><MerchantSettings /></ProtectedRoute>}/>
        <Route path="/customer-settings" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerSettings /></ProtectedRoute>}/>
        <Route path="/my-requests" element={<ProtectedRoute allowedRoles={["customer"]}><MyRequests /></ProtectedRoute>}/>
        <Route path="/merchant-bookings" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantBookings /></ProtectedRoute>}/>
        <Route path="/merchant-earnings" element={<ProtectedRoute allowedRoles={["merchant"]}><EarningsDashboard /></ProtectedRoute>}/>
        <Route path="/merchant-withdraw" element={<ProtectedRoute allowedRoles={["merchant"]}><RequestWithdrawal /></ProtectedRoute>}/>
        <Route path="/merchant-marketing" element={<ProtectedRoute allowedRoles={["merchant"]}><MarketingTools /></ProtectedRoute>}/>
        
        {/* Admin Routes */}
        <Route path="/admin-dashboard/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/users/create-merchant" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMerchantForm /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/create-merchant" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMerchantForm /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/users/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUserDetail /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/events" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEvents /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/events/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEventDetail /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/events/:id/edit" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEventForm /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/my-events" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMyEvents /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/my-events/new" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEventForm /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/my-events/:id/edit" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEventForm /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/utilities" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUtilities /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/profile" element={<ProtectedRoute allowedRoles={["admin"]}><AdminProfile /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/event-monitoring" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEventMonitoring /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/metrics" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMetrics /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/homepage" element={<ProtectedRoute allowedRoles={["admin"]}><AdminHomepageSettings /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/services" element={<ProtectedRoute allowedRoles={["admin"]}><AdminServices /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/services/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminServiceDetail /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/my-services" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMyServices /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/my-services/new" element={<ProtectedRoute allowedRoles={["admin"]}><AdminServiceForm /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/my-services/:id/edit" element={<ProtectedRoute allowedRoles={["admin"]}><AdminServiceForm /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/payments" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPayments /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/payments/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPaymentDetail /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/commissions" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCommissions /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/refunds" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRefunds /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/payouts" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPayouts /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/bookings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminBookings /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/bookings/:id" element={<ProtectedRoute allowedRoles={["admin"]}><AdminBookingDetail /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/my-bookings" element={<ProtectedRoute allowedRoles={["admin"]}><MerchantBookings layout="admin" /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/earnings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEarnings /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminReports /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/ai-recommendations" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRecommendations /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/referrals" element={<ProtectedRoute allowedRoles={["admin"]}><AdminReferrals /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/ratings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRatings /></ProtectedRoute>}/>
        <Route path="/admin-dashboard/coupons" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCoupons /></ProtectedRoute>}/>
        <Route path="/create-event" element={<ProtectedRoute allowedRoles={["merchant"]}><CreateEvent /></ProtectedRoute>}/>
        <Route path="*" element={<NotFound />}/>
      </Routes>
    </Suspense>);
};
const App = () => (<ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <CartProvider>
              <RealtimeBridge />
              <ScrollToTop />
              <Toaster />
              <Sonner />
              <AppRoutes />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>);
export default App;
