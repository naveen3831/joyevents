import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'config/app_routes.dart';
import 'config/app_theme.dart';
import 'services/auth_service.dart';
import 'services/firebase_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Safely initialize Firebase Core & FCM Service
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    await FirebaseNotificationService().initialize();
  } catch (e) {
    debugPrint('[FIREBASE INIT WARNING] $e');
  }
  
  // Preferred status bar overlay styling
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  final authService = AuthService();
  
  runApp(JoyEventsApp(authService: authService));
}

class JoyEventsApp extends StatelessWidget {
  final AuthService authService;

  const JoyEventsApp({
    super.key,
    required this.authService,
  });

  @override
  Widget build(BuildContext context) {
    final router = AppRoutes.createRouter(authService);

    return MaterialApp.router(
      title: 'JoyEvents',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
