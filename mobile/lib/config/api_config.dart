class ApiConfig {
  // Base URL for physical Android USB & LAN development
  // 127.0.0.1 works over USB with 'adb reverse tcp:5000 tcp:5000'
  // 192.168.1.37 works over local Wi-Fi LAN
  static String baseUrl = 'http://127.0.0.1:5000/api';
  static const String lanBaseUrl = 'http://192.168.1.37:5000/api';
  
  // Storage key for user override IP if needed
  static const String keyCustomIp = 'custom_base_ip';

  // Base domain for resolving image URLs (strips /api)
  static String get mediaBaseUrl {
    if (baseUrl.endsWith('/api')) {
      return baseUrl.substring(0, baseUrl.length - 4);
    }
    return baseUrl;
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

  // Auth Endpoints (Matching real Node/Express backend /api/auth/*)
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  static const String updateProfile = '/auth/profile';
  static const String changePassword = '/auth/change-password';
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
