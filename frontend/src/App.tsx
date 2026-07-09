import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";

// Lazy load all page components for better performance
const Index = lazy(() => import("./pages/Index"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Services = lazy(() => import("./pages/Services"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Contact = lazy(() => import("./pages/Contact"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const MerchantDashboard = lazy(() => import("./pages/MerchantDashboard"));
const MerchantEvents = lazy(() => import("./pages/MerchantEvents"));
const MerchantServices = lazy(() => import("./pages/MerchantServices"));
const MerchantLiveEvents = lazy(() => import("./pages/MerchantLiveEvents"));
const TicketValidation = lazy(() => import("./pages/TicketValidation"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents"));
const AdminMetrics = lazy(() => import("./pages/admin/AdminMetrics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminEventMonitoring = lazy(() => import("./pages/admin/AdminEventMonitoring"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const AdminUtilities = lazy(() => import("./pages/admin/AdminUtilities"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminCommissions = lazy(() => import("./pages/admin/AdminCommissions"));
const AdminRefunds = lazy(() => import("./pages/admin/AdminRefunds"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
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
const MarketingTools = lazy(() => import("./pages/MarketingTools"));
const EventAnalytics = lazy(() => import("./pages/EventAnalytics"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const Reviews = lazy(() => import("./pages/Reviews"));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const UpcomingBookings = lazy(() => import("./pages/UpcomingBookings"));
const Favorites = lazy(() => import("./pages/Favorites"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const QRCodeGenerator = lazy(() => import("./pages/QRCodeGenerator"));
const AIRecommendations = lazy(() => import("./pages/AIRecommendations"));
const MerchantRecommendations = lazy(() => import("./pages/MerchantRecommendations"));
const AdminRecommendations = lazy(() => import("./pages/admin/AdminRecommendations"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/services" element={<Services />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogDetail />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/services/:id" element={<ServiceDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Dashboard root redirects */}
        <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={["customer"]}><UserDashboard /></ProtectedRoute>} />
        <Route path="/merchant-dashboard" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantDashboard /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOverview /></ProtectedRoute>} />
        
        {/* Legacy redirect */}
        <Route path="/user-dashboard" element={<Navigate to="/customer-dashboard" replace />} />
        
        {/* Customer Routes */}
        <Route path="/customer-dashboard/bookings" element={<ProtectedRoute allowedRoles={["customer"]}><MyRequests /></ProtectedRoute>} />
        <Route path="/customer-dashboard/history" element={<ProtectedRoute allowedRoles={["customer"]}><BookingHistory /></ProtectedRoute>} />
        <Route path="/customer-dashboard/upcoming" element={<ProtectedRoute allowedRoles={["customer"]}><UpcomingBookings /></ProtectedRoute>} />
        <Route path="/customer-dashboard/messages" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerMessages /></ProtectedRoute>} />
        <Route path="/customer-dashboard/browse-events" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerBrowseEvents /></ProtectedRoute>} />
        <Route path="/customer-dashboard/browse-services" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerBrowseServices /></ProtectedRoute>} />
        <Route path="/customer-dashboard/events/:id" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerEventDetail /></ProtectedRoute>} />
        <Route path="/customer-dashboard/services/:id" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerServiceDetail /></ProtectedRoute>} />
        <Route path="/customer-dashboard/favorites" element={<ProtectedRoute allowedRoles={["customer"]}><Favorites /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute allowedRoles={["customer"]}><Favorites /></ProtectedRoute>} />
        <Route path="/customer-dashboard/settings" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerSettings /></ProtectedRoute>} />
        <Route path="/customer-dashboard/profile" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerProfile /></ProtectedRoute>} />
        <Route path="/customer-dashboard/ai-recommendations" element={<ProtectedRoute allowedRoles={["customer"]}><AIRecommendations /></ProtectedRoute>} />
        
        {/* Merchant Routes */}
        <Route path="/merchant-dashboard/events" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantEvents /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/live-events" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantLiveEvents /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/services" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantServices /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/profile" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantProfile /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/ticket-validation" element={<ProtectedRoute allowedRoles={["merchant"]}><TicketValidation /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/analytics" element={<ProtectedRoute allowedRoles={["merchant"]}><EventAnalytics /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/inbox" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantInbox /></ProtectedRoute>} />
        {/* Sidebar-aligned merchant routes */}
        <Route path="/merchant-dashboard/bookings" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantBookings /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/earnings" element={<ProtectedRoute allowedRoles={["merchant"]}><EarningsDashboard /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/marketing" element={<ProtectedRoute allowedRoles={["merchant"]}><MarketingTools /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/qr-codes" element={<ProtectedRoute allowedRoles={["merchant"]}><QRCodeGenerator /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/settings" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantSettings /></ProtectedRoute>} />
        <Route path="/merchant-dashboard/ai-recommendations" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantRecommendations /></ProtectedRoute>} />
        {/* Legacy merchant routes (kept for backwards compat) */}
        <Route path="/merchant-settings" element={<ProtectedRoute allowedRoles={["merchant", "admin"]}><MerchantSettings /></ProtectedRoute>} />
        <Route path="/customer-settings" element={<ProtectedRoute allowedRoles={["customer"]}><CustomerSettings /></ProtectedRoute>} />
        <Route path="/my-requests" element={<ProtectedRoute allowedRoles={["customer"]}><MyRequests /></ProtectedRoute>} />
        <Route path="/merchant-bookings" element={<ProtectedRoute allowedRoles={["merchant"]}><MerchantBookings /></ProtectedRoute>} />
        <Route path="/merchant-earnings" element={<ProtectedRoute allowedRoles={["merchant"]}><EarningsDashboard /></ProtectedRoute>} />
        <Route path="/merchant-marketing" element={<ProtectedRoute allowedRoles={["merchant"]}><MarketingTools /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin-dashboard/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin-dashboard/events" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEvents /></ProtectedRoute>} />
        <Route path="/admin-dashboard/utilities" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUtilities /></ProtectedRoute>} />
        <Route path="/admin-dashboard/profile" element={<ProtectedRoute allowedRoles={["admin"]}><AdminProfile /></ProtectedRoute>} />
        <Route path="/admin-dashboard/event-monitoring" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEventMonitoring /></ProtectedRoute>} />
        <Route path="/admin-dashboard/metrics" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMetrics /></ProtectedRoute>} />
        <Route path="/admin-dashboard/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />
        <Route path="/admin-dashboard/services" element={<ProtectedRoute allowedRoles={["admin"]}><AdminServices /></ProtectedRoute>} />
        <Route path="/admin-dashboard/payments" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin-dashboard/commissions" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCommissions /></ProtectedRoute>} />
        <Route path="/admin-dashboard/refunds" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRefunds /></ProtectedRoute>} />
        <Route path="/admin-dashboard/payouts" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPayouts /></ProtectedRoute>} />
        <Route path="/admin-dashboard/bookings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminBookings /></ProtectedRoute>} />
        <Route path="/admin-dashboard/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminReports /></ProtectedRoute>} />
        <Route path="/admin-dashboard/ai-recommendations" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRecommendations /></ProtectedRoute>} />
        <Route path="/create-event" element={<ProtectedRoute allowedRoles={["merchant"]}><CreateEvent /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <ScrollToTop />
            <Toaster />
            <Sonner />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
