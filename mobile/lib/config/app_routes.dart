import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';
import '../screens/splash/splash_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/forgot_password_screen.dart';

// Customer
import '../screens/customer/customer_shell.dart';
import '../screens/customer/home_screen.dart';
import '../screens/customer/browse_events_screen.dart';
import '../screens/customer/event_details_screen.dart';
import '../screens/customer/browse_services_screen.dart';
import '../screens/customer/service_details_screen.dart';
import '../screens/customer/cart_screen.dart';
import '../screens/customer/checkout_screen.dart';
import '../screens/customer/my_bookings_screen.dart';
import '../screens/customer/booking_details_screen.dart';
import '../screens/customer/wallet_screen.dart';
import '../screens/customer/messages_screen.dart';
import '../screens/customer/chat_details_screen.dart';
import '../screens/customer/notifications_screen.dart';
import '../screens/customer/favorites_screen.dart';
import '../screens/customer/profile_screen.dart';
import '../screens/customer/edit_profile_screen.dart';
import '../screens/customer/change_password_screen.dart';

// Merchant
import '../screens/merchant/merchant_shell.dart';
import '../screens/merchant/merchant_dashboard_screen.dart';
import '../screens/merchant/merchant_events_screen.dart';
import '../screens/merchant/merchant_event_details_screen.dart';
import '../screens/merchant/create_edit_event_screen.dart';
import '../screens/merchant/merchant_services_screen.dart';
import '../screens/merchant/merchant_service_details_screen.dart';
import '../screens/merchant/create_edit_service_screen.dart';
import '../screens/merchant/merchant_bookings_screen.dart';
import '../screens/merchant/merchant_booking_details_screen.dart';
import '../screens/merchant/merchant_wallet_screen.dart';
import '../screens/merchant/merchant_messages_screen.dart';
import '../screens/merchant/merchant_chat_screen.dart';
import '../screens/merchant/merchant_profile_screen.dart';

class AppRoutes {
  static final GlobalKey<NavigatorState> rootNavigatorKey =
      GlobalKey<NavigatorState>(debugLabel: 'root');
  static final GlobalKey<NavigatorState> customerShellKey =
      GlobalKey<NavigatorState>(debugLabel: 'customerShell');
  static final GlobalKey<NavigatorState> merchantShellKey =
      GlobalKey<NavigatorState>(debugLabel: 'merchantShell');

  static GoRouter createRouter(AuthService authService) {
    return GoRouter(
      navigatorKey: rootNavigatorKey,
      initialLocation: '/splash',
      refreshListenable: authService,
      redirect: (BuildContext context, GoRouterState state) {
        final isLoading = authService.isLoading;
        final isLoggedIn = authService.isAuthenticated;
        final isMerchant = authService.currentUser?.isMerchant ?? false;
        final isCustomer = authService.currentUser?.isCustomer ?? false;

        final location = state.matchedLocation;
        final isSplash = location == '/splash';
        final isAuthRoute = location == '/login' ||
            location == '/register' ||
            location == '/forgot-password';

        if (isLoading) {
          return isSplash ? null : '/splash';
        }

        if (!isLoggedIn) {
          return isAuthRoute ? null : '/login';
        }

        // Role-based redirect from splash / auth screens
        if (isSplash || isAuthRoute) {
          return isMerchant ? '/merchant/dashboard' : '/customer/home';
        }

        // Prevent merchant from accessing customer shell routes
        if (isMerchant && location.startsWith('/customer/')) {
          // Allow shared screens (edit-profile, change-password)
          if (location == '/customer/edit-profile' ||
              location == '/customer/change-password') {
            return null;
          }
          return '/merchant/dashboard';
        }

        // Prevent customer from accessing merchant shell routes
        if (isCustomer && location.startsWith('/merchant/')) {
          return '/customer/home';
        }

        return null;
      },
      routes: [
        GoRoute(
          path: '/splash',
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterScreen(),
        ),
        GoRoute(
          path: '/forgot-password',
          builder: (context, state) => const ForgotPasswordScreen(),
        ),

        // ── Customer Bottom Navigation Shell ─────────────────────────────────
        ShellRoute(
          navigatorKey: customerShellKey,
          builder: (context, state, child) => CustomerShell(child: child),
          routes: [
            GoRoute(
              path: '/customer/home',
              builder: (context, state) => const HomeScreen(),
            ),
            GoRoute(
              path: '/customer/events',
              builder: (context, state) => const BrowseEventsScreen(),
            ),
            GoRoute(
              path: '/customer/services',
              builder: (context, state) => const BrowseServicesScreen(),
            ),
            GoRoute(
              path: '/customer/bookings',
              builder: (context, state) => const MyBookingsScreen(),
            ),
            GoRoute(
              path: '/customer/profile',
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),

        // ── Customer Full-Screen Routes ───────────────────────────────────────
        GoRoute(
          path: '/customer/event-details/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            final extra = state.extra;
            return EventDetailsScreen(eventId: id, eventModel: extra);
          },
        ),
        GoRoute(
          path: '/customer/service-details/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            final extra = state.extra;
            return ServiceDetailsScreen(serviceId: id, serviceModel: extra);
          },
        ),
        GoRoute(
          path: '/customer/cart',
          builder: (context, state) => const CartScreen(),
        ),
        GoRoute(
          path: '/customer/checkout',
          builder: (context, state) {
            final extra = state.extra as Map<String, dynamic>?;
            return CheckoutScreen(checkoutData: extra);
          },
        ),
        GoRoute(
          path: '/customer/booking-details/:id',
          builder: (context, state) {
            final extra = state.extra;
            return BookingDetailsScreen(booking: extra);
          },
        ),
        GoRoute(
          path: '/customer/wallet',
          builder: (context, state) => const WalletScreen(),
        ),
        GoRoute(
          path: '/customer/messages',
          builder: (context, state) => const MessagesScreen(),
        ),
        GoRoute(
          path: '/customer/chat-details',
          builder: (context, state) {
            final extra = state.extra as Map<String, dynamic>?;
            return ChatDetailsScreen(messageData: extra);
          },
        ),
        GoRoute(
          path: '/customer/notifications',
          builder: (context, state) => const NotificationsScreen(),
        ),
        GoRoute(
          path: '/customer/favorites',
          builder: (context, state) => const FavoritesScreen(),
        ),
        GoRoute(
          path: '/customer/edit-profile',
          builder: (context, state) => const EditProfileScreen(),
        ),
        GoRoute(
          path: '/customer/change-password',
          builder: (context, state) => const ChangePasswordScreen(),
        ),

        // ── Merchant Bottom Navigation Shell ─────────────────────────────────
        ShellRoute(
          navigatorKey: merchantShellKey,
          builder: (context, state, child) => MerchantShell(child: child),
          routes: [
            GoRoute(
              path: '/merchant/dashboard',
              builder: (context, state) => const MerchantDashboardScreen(),
            ),
            GoRoute(
              path: '/merchant/events',
              builder: (context, state) => const MerchantEventsScreen(),
            ),
            GoRoute(
              path: '/merchant/services',
              builder: (context, state) => const MerchantServicesScreen(),
            ),
            GoRoute(
              path: '/merchant/bookings',
              builder: (context, state) => const MerchantBookingsScreen(),
            ),
            GoRoute(
              path: '/merchant/profile',
              builder: (context, state) => const MerchantProfileScreen(),
            ),
          ],
        ),

        // ── Merchant Full-Screen Routes ───────────────────────────────────────
        GoRoute(
          path: '/merchant/event-details/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            final extra = state.extra;
            return MerchantEventDetailsScreen(eventId: id, initialData: extra);
          },
        ),
        GoRoute(
          path: '/merchant/create-event',
          builder: (context, state) => const CreateEditEventScreen(),
        ),
        GoRoute(
          path: '/merchant/edit-event/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            final extra = state.extra as Map<String, dynamic>?;
            return CreateEditEventScreen(eventId: id, initialData: extra);
          },
        ),
        GoRoute(
          path: '/merchant/service-details/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            final extra = state.extra;
            return MerchantServiceDetailsScreen(serviceId: id, initialData: extra);
          },
        ),
        GoRoute(
          path: '/merchant/create-service',
          builder: (context, state) => const CreateEditServiceScreen(),
        ),
        GoRoute(
          path: '/merchant/edit-service/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            final extra = state.extra as Map<String, dynamic>?;
            return CreateEditServiceScreen(serviceId: id, initialData: extra);
          },
        ),
        GoRoute(
          path: '/merchant/booking-details/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            final extra = state.extra;
            return MerchantBookingDetailsScreen(
                bookingId: id, initialData: extra);
          },
        ),
        GoRoute(
          path: '/merchant/wallet',
          builder: (context, state) => const MerchantWalletScreen(),
        ),
        GoRoute(
          path: '/merchant/messages',
          builder: (context, state) => const MerchantMessagesScreen(),
        ),
        GoRoute(
          path: '/merchant/chat-details/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            final extra = state.extra;
            return MerchantChatScreen(messageId: id, initialData: extra);
          },
        ),
        GoRoute(
          path: '/merchant/notifications',
          builder: (context, state) => const NotificationsScreen(),
        ),
      ],
    );
  }
}
