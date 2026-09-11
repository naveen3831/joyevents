import '../config/api_config.dart';
import '../models/notification_model.dart';
import 'api_service.dart';

class NotificationService {
  final ApiService _apiService = ApiService();

  // Fetch customer notifications (/api/notifications)
  Future<Map<String, dynamic>> getNotifications() async {
    try {
      final response = await _apiService.dio.get(ApiConfig.notifications);
      final data = response.data;
      List rawList = [];
      int unreadCount = 0;

      if (data is Map) {
        if (data.containsKey('notifications')) {
          rawList = data['notifications'] as List;
        }
        if (data.containsKey('unreadCount')) {
          unreadCount = (data['unreadCount'] is num)
              ? (data['unreadCount'] as num).toInt()
              : 0;
        }
      }

      final notifications = rawList
          .map((n) => NotificationModel.fromJson(n as Map<String, dynamic>))
          .toList();

      return {
        'notifications': notifications,
        'unreadCount': unreadCount,
      };
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Mark notification read (/api/notifications/:id/read)
  Future<void> markAsRead(String id) async {
    try {
      await _apiService.dio.patch(ApiConfig.markNotificationRead(id));
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Mark all notifications read (/api/notifications/read-all)
  Future<void> markAllAsRead() async {
    try {
      await _apiService.dio.patch(ApiConfig.markAllNotificationsRead);
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }
}
