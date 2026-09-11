import '../config/api_config.dart';
import '../models/service_model.dart';
import 'api_service.dart';

class ServiceService {
  final ApiService _apiService = ApiService();

  Future<List<ServiceModel>> getServices({String? category, String? search}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (category != null && category.isNotEmpty && category.toLowerCase() != 'all') {
        queryParams['category'] = category;
      }

      final response = await _apiService.dio.get(
        ApiConfig.services,
        queryParameters: queryParams,
      );

      final data = response.data;
      List servicesRaw = [];
      if (data is Map && data.containsKey('services')) {
        servicesRaw = data['services'] as List;
      } else if (data is List) {
        servicesRaw = data;
      }

      List<ServiceModel> services = servicesRaw
          .map((item) => ServiceModel.fromJson(item as Map<String, dynamic>))
          .toList();

      if (search != null && search.trim().isNotEmpty) {
        final query = search.trim().toLowerCase();
        services = services.where((s) {
          return s.name.toLowerCase().contains(query) ||
              s.description.toLowerCase().contains(query) ||
              s.location.toLowerCase().contains(query);
        }).toList();
      }

      return services;
    } catch (e) {
      throw ApiService.parseError(e);
    }
  }
}
