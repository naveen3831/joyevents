import '../config/api_config.dart';
import '../models/message_model.dart';
import 'api_service.dart';

class MessageService {
  final ApiService _apiService = ApiService();

  // Fetch customer inbox (/api/contact/customer-inbox)
  Future<List<MessageModel>> getCustomerInbox() async {
    try {
      final response = await _apiService.dio.get(ApiConfig.customerInbox);
      final data = response.data;
      List rawMessages = [];
      if (data is Map && data.containsKey('messages')) {
        rawMessages = data['messages'] as List;
      } else if (data is List) {
        rawMessages = data;
      }

      return rawMessages
          .map((m) => MessageModel.fromJson(m as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Send enquiry to merchant (/api/contact/merchant)
  Future<void> sendEnquiry({
    required String senderName,
    required String senderEmail,
    required String message,
    String? merchantId,
    String? eventId,
    String? serviceId,
    String? bookingId,
    String? customerId,
  }) async {
    try {
      await _apiService.dio.post(
        ApiConfig.contactMerchant,
        data: {
          'senderName': senderName,
          'senderEmail': senderEmail,
          'message': message,
          if (merchantId != null) 'merchantId': merchantId,
          if (eventId != null) 'eventId': eventId,
          if (serviceId != null) 'serviceId': serviceId,
          if (bookingId != null) 'bookingId': bookingId,
          if (customerId != null) 'customerId': customerId,
        },
      );
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  // Customer replies to enquiry thread (/api/contact/:id/customer-reply)
  Future<MessageModel> sendCustomerReply(String messageId, String text) async {
    try {
      final response = await _apiService.dio.post(
        ApiConfig.replyCustomerMessage(messageId),
        data: {'text': text},
      );

      final data = response.data;
      final msgData = data['message'] ?? data;
      return MessageModel.fromJson(msgData as Map<String, dynamic>);
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }
}
