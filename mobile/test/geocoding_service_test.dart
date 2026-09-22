import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/geocoding_service.dart';

void main() {
  test('GeocodingService searches locations and scores results correctly', () async {
    final geocodingService = GeocodingService();
    final results = await geocodingService.searchLocations('Hyderabad');

    expect(results, isNotEmpty);
    final first = results.first;
    expect(first.name.toLowerCase().contains('hyderabad') || first.fullAddress.toLowerCase().contains('hyderabad'), isTrue);
  });
}
