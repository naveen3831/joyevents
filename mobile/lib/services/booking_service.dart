import '../config/api_config.dart';
import '../models/booking_model.dart';
import 'api_service.dart';

class BookingService {
  final ApiService _apiService = ApiService();

  // Create booking
  Future<BookingModel> createBooking(Map<String, dynamic> bookingPayload) async {
    try {
      final response = await _apiService.dio.post(
        ApiConfig.bookings,
        data: bookingPayload,
      );

      final data = response.data;
      final bookingData = data['booking'] ?? data;
      return BookingModel.fromJson(bookingData as Map<String, dynamic>);
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Get customer's own bookings (/api/bookings/my)
  Future<List<BookingModel>> getMyBookings() async {
    try {
      final response = await _apiService.dio.get(ApiConfig.myBookings);
      final data = response.data;
      List rawList = [];
      if (data is Map && data.containsKey('bookings')) {
        rawList = data['bookings'] as List;
      } else if (data is List) {
        rawList = data;
      }

      return rawList
          .map((b) => BookingModel.fromJson(b as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Submit rating for completed booking
  Future<void> submitRating(String bookingId, double score, String comment) async {
    try {
      await _apiService.dio.patch(
        ApiConfig.rateBooking(bookingId),
        data: {
          'score': score,
          'comment': comment.trim(),
        },
      );
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }
}
