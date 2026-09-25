import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'config/app_routes.dart';
import 'config/app_theme.dart';
import 'services/app_lifecycle_service.dart';
import 'services/auth_service.dart';
import 'services/firebase_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize App Lifecycle & Battery Optimization Observer
  AppLifecycleService().initialize();

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

class JoyEventsApp extends StatefulWidget {
  final AuthService authService;

  const JoyEventsApp({
    super.key,
    required this.authService,
  });

  @override
  State<JoyEventsApp> createState() => _JoyEventsAppState();
}

class _JoyEventsAppState extends State<JoyEventsApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = AppRoutes.createRouter(widget.authService);
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AuthService>.value(
      value: widget.authService,
      child: MaterialApp.router(
        title: 'Joy Events',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        routerConfig: _router,
      ),
    );
  }
}


