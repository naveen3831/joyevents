import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';
import '../screens/splash/splash_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
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

class AppRoutes {
  static final GlobalKey<NavigatorState> rootNavigatorKey =
      GlobalKey<NavigatorState>(debugLabel: 'root');
  static final GlobalKey<NavigatorState> shellNavigatorKey =
      GlobalKey<NavigatorState>(debugLabel: 'shell');

  static GoRouter createRouter(AuthService authService) {
    return GoRouter(
      navigatorKey: rootNavigatorKey,
      initialLocation: '/splash',
      refreshListenable: authService,
      redirect: (BuildContext context, GoRouterState state) {
        final isLoading = authService.isLoading;
        final isLoggedIn = authService.isAuthenticated;

        final isSplash = state.matchedLocation == '/splash';
        final isAuthRoute = state.matchedLocation == '/login' ||
            state.matchedLocation == '/register' ||
            state.matchedLocation == '/forgot-password';

        if (isLoading) {
          return isSplash ? null : '/splash';
        }

        if (!isLoggedIn) {
          return isAuthRoute ? null : '/login';
        }

        // If logged in and on splash or auth routes -> redirect to Customer Home
        if (isSplash || isAuthRoute) {
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

        // Customer Bottom Navigation Shell
        ShellRoute(
          navigatorKey: shellNavigatorKey,
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

        // Sub-routes outside shell (full screen)
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
      ],
    );
  }
}
