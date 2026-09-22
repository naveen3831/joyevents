import 'package:dio/dio.dart';
import 'api_service.dart';

class MerchantService {
  static final MerchantService _instance = MerchantService._internal();
  factory MerchantService() => _instance;
  MerchantService._internal();

  final _api = ApiService();

  // ─── Events ─────────────────────────────────────────────────────────────────

  Future<List<dynamic>> getMyEvents() async {
    try {
      final res = await _api.dio.get('/events/my-events');
      final data = res.data;
      if (data is List) return data;
      if (data is Map && data['events'] is List) return data['events'] as List;
      return [];
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<Map<String, dynamic>> createEvent(FormData formData) async {
    try {
      final res = await _api.dio.post('/events', data: formData);
      return res.data as Map<String, dynamic>;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<Map<String, dynamic>> updateEvent(String id, FormData formData) async {
    try {
      final res = await _api.dio.patch('/events/$id', data: formData);
      return res.data as Map<String, dynamic>;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<void> toggleEventLive(String id, bool isLive) async {
    try {
      await _api.dio.patch('/events/$id', data: {'live': isLive});
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<void> deleteEvent(String id) async {
    try {
      await _api.dio.delete('/events/$id');
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // ─── Categories & AI ─────────────────────────────────────────────────────────

  Future<List<dynamic>> getCategories({String type = 'event'}) async {
    try {
      final res = await _api.dio.get('/categories', queryParameters: {'type': type});
      final data = res.data;
      if (data is Map && data['categories'] is List) return data['categories'] as List;
      if (data is List) return data;
      return [];
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<Map<String, dynamic>> createCategory(String name, {String type = 'event'}) async {
    try {
      final res = await _api.dio.post('/categories', data: {'name': name, 'type': type});
      return res.data as Map<String, dynamic>;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<Map<String, dynamic>> generateAISuggestions(Map<String, dynamic> body) async {
    try {
      final res = await _api.dio.post('/ai/suggest', data: body);
      return res.data as Map<String, dynamic>;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // ─── Services ────────────────────────────────────────────────────────────────

  Future<List<dynamic>> getMyServices() async {
    try {
      final res = await _api.dio.get('/services/my-services');
      final data = res.data;
      if (data is List) return data;
      if (data is Map && data['services'] is List) return data['services'] as List;
      return [];
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<Map<String, dynamic>> createService(FormData formData) async {
    try {
      final res = await _api.dio.post('/services', data: formData);
      return res.data as Map<String, dynamic>;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<Map<String, dynamic>> updateService(String id, FormData formData) async {
    try {
      final res = await _api.dio.patch('/services/$id', data: formData);
      return res.data as Map<String, dynamic>;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<void> deleteService(String id) async {
    try {
      await _api.dio.delete('/services/$id');
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<Map<String, dynamic>> getServiceDetails(String id) async {
    try {
      final res = await _api.dio.get('/services/$id');
      final data = res.data;
      if (data is Map && data['service'] is Map) {
        return Map<String, dynamic>.from(data['service']);
      }
      if (data is Map<String, dynamic>) {
        return data;
      }
      return {};
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // ─── Bookings ────────────────────────────────────────────────────────────────

  Future<List<dynamic>> getAssignedBookings() async {
    try {
      final res = await _api.dio.get('/bookings/assigned');
      final data = res.data;
      if (data is List) return data;
      if (data is Map && data['bookings'] is List) return data['bookings'] as List;
      return [];
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<void> updateBookingStatus(String id, String status) async {
    try {
      await _api.dio.patch('/bookings/$id/status', data: {'status': status});
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<void> approveBooking(String id, Map<String, dynamic> payload) async {
    try {
      await _api.dio.patch('/bookings/$id/approve', data: payload);
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<void> completeBooking(String id) async {
    try {
      await _api.dio.patch('/bookings/$id/complete');
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // ─── Earnings ────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getEarningsDashboard() async {
    try {
      final res = await _api.dio.get('/earnings/dashboard');
      return res.data as Map<String, dynamic>;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<List<dynamic>> getTransactions() async {
    try {
      final res = await _api.dio.get('/earnings/transactions');
      final data = res.data;
      if (data is List) return data;
      if (data is Map && data['transactions'] is List) return data['transactions'] as List;
      return [];
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<List<dynamic>> getWithdrawals() async {
    try {
      final res = await _api.dio.get('/earnings/withdrawals');
      final data = res.data;
      if (data is List) return data;
      if (data is Map && data['withdrawals'] is List) return data['withdrawals'] as List;
      return [];
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<void> requestWithdrawal(Map<String, dynamic> payload) async {
    try {
      await _api.dio.post('/earnings/withdrawal-request', data: payload);
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // ─── Messages / Inbox ────────────────────────────────────────────────────────

  Future<List<dynamic>> getInbox() async {
    try {
      final res = await _api.dio.get('/contact/inbox');
      final data = res.data;
      if (data is List) return data;
      if (data is Map && data['messages'] is List) return data['messages'] as List;
      return [];
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<Map<String, dynamic>> getMessageThread(String id) async {
    try {
      final res = await _api.dio.get('/contact/$id');
      return res.data as Map<String, dynamic>;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<void> replyToMessage(String id, String text) async {
    try {
      await _api.dio.post('/contact/$id/reply', data: {'text': text});
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // ─── Merchant Profile ────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getMerchantProfile() async {
    try {
      final res = await _api.dio.get('/merchant/profile');
      return res.data as Map<String, dynamic>;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }
}
