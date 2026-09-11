import '../config/api_config.dart';
import '../models/event_model.dart';
import 'api_service.dart';

class EventService {
  final ApiService _apiService = ApiService();

  Future<List<EventModel>> getEvents({String? category, String? search}) async {
    try {
      final response = await _apiService.dio.get(ApiConfig.events);
      final data = response.data;
      List eventsRaw = [];
      if (data is Map && data.containsKey('events')) {
        eventsRaw = data['events'] as List;
      } else if (data is List) {
        eventsRaw = data;
      }

      List<EventModel> events = eventsRaw
          .map((item) => EventModel.fromJson(item as Map<String, dynamic>))
          .toList();

      // Client-side filtering if category / search parameters are provided
      if (category != null && category.isNotEmpty && category.toLowerCase() != 'all') {
        events = events
            .where((e) => e.category.toLowerCase() == category.toLowerCase())
            .toList();
      }

      if (search != null && search.trim().isNotEmpty) {
        final query = search.trim().toLowerCase();
        events = events.where((e) {
          return e.title.toLowerCase().contains(query) ||
              e.description.toLowerCase().contains(query) ||
              e.location.toLowerCase().contains(query);
        }).toList();
      }

      return events;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }

  Future<EventModel?> getEventById(String id) async {
    try {
      final events = await getEvents();
      return events.firstWhere((e) => e.id == id);
    } catch (_) {
      return null;
    }
  }
}
