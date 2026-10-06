import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Centralized API configuration for JoyEvents mobile application.
/// Supports ADB USB reverse (127.0.0.1:5000), Localhost, Android Emulator (10.0.2.2),
/// Local LAN IP (192.168.88.19), Public Tunnels, and Production endpoints.
class ApiConfig {
  static const _storage = FlutterSecureStorage();

  // Development Candidate Base URLs
  static const String adbUsbBaseUrl = 'http://127.0.0.1:5000/api';
  static const String localhostBaseUrl = 'http://localhost:5000/api';
  static const String emulatorBaseUrl = 'http://10.0.2.2:5000/api';
  static const String lanBaseUrl = 'http://192.168.88.19:5000/api';
  static const String publicTunnelBaseUrl = 'https://cold-tools-think.loca.lt/api';

  // Production Live Base URL
  static const String prodBaseUrl = 'https://joyevents.speshway.site/api';

  // WebSockets Base URLs
  static const String devWsUrl = 'ws://127.0.0.1:5000/ws';
  static const String prodWsUrl = 'wss://joyevents.speshway.site/ws';

  // Storage key for user-configured custom server IP
  static const String keyCustomIp = 'custom_base_ip';

  // Internal dynamic override for debug mode
  static String _overrideBaseUrl = '';
  static bool _initialized = false;

  /// Initializes ApiConfig from secure storage (restores custom IP if saved previously)
  static Future<void> init() async {
    if (_initialized) return;
    try {
      final savedIp = await _storage.read(key: keyCustomIp);
      if (savedIp != null && savedIp.trim().isNotEmpty) {
        final normalized = normalizeUrl(savedIp.trim());
        // If the stored IP is an unreachable loopback from older debug runs, discard it
        if (normalized.contains('127.0.0.1') || normalized.contains('localhost')) {
          _overrideBaseUrl = '';
          await _storage.delete(key: keyCustomIp);
        } else {
          _overrideBaseUrl = normalized;
        }
        if (kDebugMode) {
          debugPrint('[ApiConfig] Active server IP: ${_overrideBaseUrl.isNotEmpty ? _overrideBaseUrl : prodBaseUrl}');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[ApiConfig] Error loading saved IP: $e');
      }
    } finally {
      _initialized = true;
    }
  }

  /// Reset to live cloud server (clears custom override)
  static Future<void> resetToProduction() async {
    _overrideBaseUrl = '';
    await _storage.delete(key: keyCustomIp);
  }

  /// Active Base URL for API requests. Defaults to Live Cloud Server so it works on any network.
  static String get baseUrl {
    if (_overrideBaseUrl.isNotEmpty) {
      return _overrideBaseUrl;
    }
    return prodBaseUrl;
  }

  static set baseUrl(String value) {
    final normalized = normalizeUrl(value);
    if (normalized == prodBaseUrl) {
      _overrideBaseUrl = '';
      _storage.delete(key: keyCustomIp);
    } else {
      _overrideBaseUrl = normalized;
      _storage.write(key: keyCustomIp, value: _overrideBaseUrl);
    }
  }

  /// Safely formats user-entered or default URL strings to have http(s):// and /api suffix
  static String normalizeUrl(String input) {
    var raw = input.trim();
    if (raw.isEmpty) return prodBaseUrl;
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      raw = 'http://$raw';
    }
    if (raw.endsWith('/')) {
      raw = raw.substring(0, raw.length - 1);
    }
    if (!raw.endsWith('/api')) {
      raw = '$raw/api';
    }
    return raw;
  }

  static String get wsUrl {
    if (kReleaseMode || _overrideBaseUrl.isEmpty) {
      return prodWsUrl;
    }
    final current = baseUrl;
    final uri = Uri.parse(current);
    final scheme = uri.scheme == 'https' ? 'wss' : 'ws';
    final port = uri.port > 0 ? uri.port : 5000;
    return '$scheme://${uri.host}:$port/ws';
  }

  // Base domain for resolving image URLs (strips /api)
  static String get mediaBaseUrl {
    final currentBase = baseUrl;
    if (currentBase.endsWith('/api')) {
      return currentBase.substring(0, currentBase.length - 4);
    }
    return currentBase;
  }

  // Resolves image relative path e.g. "/uploads/abc.jpg" to full network URL
  static String resolveImageUrl(String? path) {
    if (path == null || path.isEmpty) {
      return '';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return '$mediaBaseUrl$cleanPath';
  }

  /// Probes candidate backend servers and auto-switches to the first responsive server
  static Future<String?> autoDetectWorkingServer() async {
    final candidates = [
      prodBaseUrl,
      adbUsbBaseUrl,
      localhostBaseUrl,
      emulatorBaseUrl,
      lanBaseUrl,
      publicTunnelBaseUrl,
    ];

    final dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 4),
      receiveTimeout: const Duration(seconds: 4),
    ));

    for (final candidate in candidates) {
      try {
        final res = await dio.get('$candidate/categories');
        if (res.statusCode == 200) {
          baseUrl = candidate;
          if (kDebugMode) {
            debugPrint('[ApiConfig] Auto-detected working backend server: $candidate');
          }
          return candidate;
        }
      } catch (_) {
        // Try next candidate
      }
    }
    return null;
  }

  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  static const String updateProfile = '/auth/profile';
  static const String changePassword = '/auth/change-password';
  static const String deleteAccount = '/auth/delete-account';
  static const String forgotPassword = '/auth/forgot-password';
  static const String addWalletFunds = '/auth/add-wallet-funds';
  static const String withdrawWallet = '/auth/withdraw';

  // Events Endpoints
  static const String events = '/events';

  // Services Endpoints
  static const String services = '/services';

  // Bookings Endpoints
  static const String bookings = '/bookings';
  static String myBookings = '/bookings/my';
  static String rateBooking(String id) => '/bookings/$id/rate';

  // Favorites Endpoints
  static const String favorites = '/favorites';
  static String checkFavorite(String type, String id) => '/favorites/check/$type/$id';
  static String deleteFavorite(String id) => '/favorites/$id';

  // Notifications Endpoints
  static const String notifications = '/notifications';
  static String markNotificationRead(String id) => '/notifications/$id/read';
  static const String markAllNotificationsRead = '/notifications/read-all';

  // Contact / Messages Endpoints
  static const String customerInbox = '/contact/customer-inbox';
  static const String contactMerchant = '/contact/merchant';
  static String replyCustomerMessage(String id) => '/contact/$id/customer-reply';
}
