import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/app_routes.dart';
import 'api_service.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
    if (kDebugMode) {
      debugPrint('[FCM BACKGROUND] Message ID: ${message.messageId}, Title: ${message.notification?.title}');
    }
  } catch (e) {
    if (kDebugMode) {
      debugPrint('[FCM BACKGROUND ERROR] $e');
    }
  }
}

class FirebaseNotificationService {
  static final FirebaseNotificationService _instance = FirebaseNotificationService._internal();
  factory FirebaseNotificationService() => _instance;

  String? _fcmToken;
  String? get fcmToken => _fcmToken;
  bool _initialized = false;

  FirebaseNotificationService._internal();

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // 1. Request notification permission (Android 13+ & iOS)
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (kDebugMode) {
        debugPrint('[FCM PERMISSION] Authorization Status: ${settings.authorizationStatus}');
      }

      // 2. Obtain device FCM token safely
      try {
        _fcmToken = await messaging.getToken();
        if (kDebugMode && _fcmToken != null) {
          debugPrint('[FCM TOKEN] Retrieved FCM Token: $_fcmToken');
        }
      } catch (tokenErr) {
        if (kDebugMode) {
          debugPrint('[FCM TOKEN WARNING] Could not retrieve token immediately: $tokenErr');
        }
      }

      // 3. Listen for FCM token refresh
      messaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        if (kDebugMode) {
          debugPrint('[FCM TOKEN REFRESHED] New Token: $newToken');
        }
        registerTokenWithBackend();
      });

      // 4. Foreground Message Listener
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        if (kDebugMode) {
          debugPrint('[FCM FOREGROUND] Received message: ${message.notification?.title}');
        }
        _showInAppForegroundNotification(message);
      });

      // 5. App Opened from Background State via Notification Tap
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        if (kDebugMode) {
          debugPrint('[FCM TAP BACKGROUND] User tapped notification: ${message.data}');
        }
        _handleNotificationTap(message);
      });

      // 6. App Opened from Terminated State via Notification Tap
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        if (kDebugMode) {
          debugPrint('[FCM TAP TERMINATED] User launched app from notification: ${initialMessage.data}');
        }
        _handleNotificationTap(initialMessage);
      }

      _initialized = true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[FCM INIT ERROR] Failed to initialize Firebase Messaging: $e');
      }
    }
  }

  /// Register current device FCM token with Node.js backend
  Future<void> registerTokenWithBackend() async {
    if (_fcmToken == null || _fcmToken!.isEmpty) return;

    try {
      final response = await ApiService().dio.post(
        '/notifications/device-token',
        data: {
          'token': _fcmToken,
          'platform': 'android',
        },
      );
      if (kDebugMode) {
        debugPrint('[FCM BACKEND SYNC] Token registered successfully: ${response.data}');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[FCM BACKEND SYNC WARNING] Failed to register token with backend: $e');
      }
    }
  }

  /// Unregister FCM token from Node.js backend on logout
  Future<void> unregisterTokenFromBackend() async {
    if (_fcmToken == null || _fcmToken!.isEmpty) return;

    try {
      await ApiService().dio.delete(
        '/notifications/device-token',
        data: {
          'token': _fcmToken,
        },
      );
      if (kDebugMode) {
        debugPrint('[FCM BACKEND SYNC] Token unregistered successfully.');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[FCM BACKEND SYNC WARNING] Failed to unregister token: $e');
      }
    }
  }

  /// Displays a clean in-app banner for foreground notifications
  void _showInAppForegroundNotification(RemoteMessage message) {
    final title = message.notification?.title ?? 'Notification';
    final body = message.notification?.body ?? '';

    final context = AppRoutes.rootNavigatorKey.currentContext;
    if (context == null || !context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
            ),
            if (body.isNotEmpty)
              Text(
                body,
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
          ],
        ),
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF1E293B),
        action: SnackBarAction(
          label: 'View',
          textColor: const Color(0xFF38BDF8),
          onPressed: () {
            _handleNotificationTap(message);
          },
        ),
      ),
    );
  }

  /// Navigates to appropriate app screen when a notification is tapped
  void _handleNotificationTap(RemoteMessage message) {
    final context = AppRoutes.rootNavigatorKey.currentContext;
    if (context == null || !context.mounted) return;

    final data = message.data;
    final type = data['type']?.toString();
    final relatedId = data['relatedId']?.toString();

    if (type == 'booking' && relatedId != null && relatedId.isNotEmpty) {
      context.push('/customer/booking-details/$relatedId');
    } else if (type == 'booking') {
      context.go('/customer/bookings');
    } else if (type == 'wallet') {
      context.push('/customer/wallet');
    } else {
      context.push('/customer/notifications');
    }
  }
}
