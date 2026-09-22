import 'package:dio/dio.dart';
import '../models/location_suggestion.dart';

class GeocodingService {
  final Dio _dio;

  static const Set<String> _venueGenericWords = {
    'indoor', 'outdoor', 'stadium', 'sports', 'complex', 'center', 'centre',
    'hall', 'arena', 'park', 'ground', 'grounds', 'road', 'street', 'avenue',
    'building', 'hotel', 'plaza', 'tower', 'towers', 'garden', 'gardens',
    'auditorium', 'club', 'resort', 'convention', 'exhibition', 'international',
    'st', 'rd', 'ave', 'blvd', 'dr'
  };

  GeocodingService({Dio? dio})
      : _dio = dio ??
            Dio(
              BaseOptions(
                headers: {
                  'User-Agent': 'EventozaApp/1.0',
                  'Accept-Language': 'en',
                },
                connectTimeout: const Duration(seconds: 4),
                receiveTimeout: const Duration(seconds: 4),
              ),
            );

  int scoreLocationResult(LocationSuggestion item, String rawQuery) {
    final queryClean = rawQuery.toLowerCase().trim();
    final queryTokens = queryClean
        .split(RegExp(r'[\s,/.\-]+'))
        .where((t) => t.length > 1)
        .toList();
    if (queryTokens.isEmpty) return 0;

    final nameLower = item.name.toLowerCase();
    final addressLower = item.address.toLowerCase();
    final fullLower = item.fullAddress.isNotEmpty
        ? item.fullAddress.toLowerCase()
        : '$nameLower $addressLower';
    final countryLower = (item.country.isNotEmpty ? item.country : addressLower).toLowerCase();

    int score = 0;

    // 1. Country Preference (India boost)
    final isIndia = countryLower.contains('india') || countryLower.contains('in');
    if (isIndia) {
      score += 120;
    }

    // 2. Separate specific tokens from generic words
    final specificTokens = queryTokens.where((t) => !_venueGenericWords.contains(t)).toList();
    final genericTokens = queryTokens.where((t) => _venueGenericWords.contains(t)).toList();

    // 3. Specific Locality / Name Token Matching
    int specificMatches = 0;
    for (final token in specificTokens) {
      if (fullLower.contains(token)) {
        specificMatches++;
        if (nameLower.contains(token)) {
          score += 90;
        } else {
          score += 60;
        }
      }
    }

    if (specificTokens.isNotEmpty) {
      if (specificMatches == 0) {
        score -= 250; // Penalty for missing key locality tokens
      } else if (specificMatches == specificTokens.length) {
        score += 150; // Full match bonus
      }
    }

    // 4. Generic Token Matching
    for (final token in genericTokens) {
      if (nameLower.contains(token)) {
        score += 30;
      } else if (fullLower.contains(token)) {
        score += 15;
      }
    }

    // 5. Total Token Coverage Ratio
    final matchedTotalTokens = queryTokens.where((t) => fullLower.contains(t)).length;
    final coverageRatio = matchedTotalTokens / queryTokens.length;
    score += (coverageRatio * 70).round();

    // 6. Exact or Phrase Match Bonus
    if (nameLower.contains(queryClean)) {
      score += 100;
    } else if (fullLower.contains(queryClean)) {
      score += 60;
    }

    return score;
  }

  List<LocationSuggestion> deduplicateLocations(List<LocationSuggestion> locations) {
    final seen = <String>{};
    final result = <LocationSuggestion>[];

    for (final loc in locations) {
      if (loc.lat == 0.0 && loc.lng == 0.0) continue;

      final key = '${loc.lat.toStringAsFixed(3)},${loc.lng.toStringAsFixed(3)}:${loc.name.toLowerCase()}';
      final addressKey = loc.fullAddress.toLowerCase();

      if (!seen.contains(key) && !seen.contains(addressKey)) {
        seen.add(key);
        seen.add(addressKey);
        result.add(loc);
      }
    }

    return result;
  }

  Future<List<LocationSuggestion>> fetchPhoton(
    String query, {
    bool biasIndia = true,
    CancelToken? cancelToken,
  }) async {
    try {
      final biasParams = biasIndia ? '&lat=20.5937&lon=78.9629&location_bias_scale=0.2' : '';
      final url = 'https://photon.komoot.io/api/?q=${Uri.encodeComponent(query)}&limit=10$biasParams';

      final response = await _dio.get(url, cancelToken: cancelToken);

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final features = data['features'] as List?;
        if (features != null && features.isNotEmpty) {
          final results = <LocationSuggestion>[];
          for (final f in features) {
            if (f is! Map<String, dynamic>) continue;
            final p = (f['properties'] as Map<String, dynamic>?) ?? {};
            final coords = (f['geometry']?['coordinates'] as List?) ?? [0, 0];

            final name = p['name']?.toString() ?? p['street']?.toString() ?? p['city']?.toString() ?? query;
            final country = p['country']?.toString() ?? '';

            final parts = <String>[];
            final street = p['street']?.toString();
            if (street != null && street != name) parts.add(street);
            final locality = p['locality']?.toString();
            if (locality != null && locality != name) parts.add(locality);
            final district = p['district']?.toString();
            if (district != null && district != name) parts.add(district);
            final city = p['city']?.toString() ?? p['county']?.toString();
            if (city != null) parts.add(city);
            final state = p['state']?.toString();
            if (state != null) parts.add(state);
            if (country.isNotEmpty) parts.add(country);

            final addressParts = parts.toSet().toList();
            final address = addressParts.join(', ');
            final fullAddress = name.isNotEmpty
                ? (address.isNotEmpty && !address.toLowerCase().contains(name.toLowerCase())
                    ? '$name, $address'
                    : address.isNotEmpty
                        ? address
                        : name)
                : address;

            final lng = (coords.isNotEmpty && coords[0] is num) ? (coords[0] as num).toDouble() : 0.0;
            final lat = (coords.length > 1 && coords[1] is num) ? (coords[1] as num).toDouble() : 0.0;

            if (lat != 0.0 || lng != 0.0) {
              results.add(LocationSuggestion(
                name: name.isNotEmpty ? name : (address.isNotEmpty ? address : query),
                address: address.isNotEmpty ? address : name,
                fullAddress: fullAddress.length > 150 ? fullAddress.substring(0, 150) : fullAddress,
                country: country,
                lat: lat,
                lng: lng,
              ));
            }
          }
          return results;
        }
      }
    } catch (e) {
      if (e is DioException && CancelToken.isCancel(e)) rethrow;
    }
    return [];
  }

  Future<List<LocationSuggestion>> fetchNominatim(
    String query, {
    String? countryFilter = 'in',
    CancelToken? cancelToken,
  }) async {
    try {
      final countryParam = countryFilter != null ? '&countrycodes=$countryFilter' : '';
      final url = 'https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(query)}&format=json&addressdetails=1&limit=8$countryParam';

      final response = await _dio.get(url, cancelToken: cancelToken);

      if (response.statusCode == 200 && response.data is List) {
        final data = response.data as List;
        final results = <LocationSuggestion>[];
        for (final item in data) {
          if (item is! Map<String, dynamic>) continue;
          final displayName = item['display_name']?.toString() ?? '';
          final name = item['name']?.toString() ?? (displayName.contains(',') ? displayName.split(',').first.trim() : displayName);
          final addr = (item['address'] as Map<String, dynamic>?) ?? {};
          final country = addr['country']?.toString() ?? '';

          final parts = <String>[];
          final road = addr['road']?.toString();
          if (road != null && road != name) parts.add(road);
          final sub = addr['suburb']?.toString() ?? addr['neighbourhood']?.toString();
          if (sub != null) parts.add(sub);
          final city = addr['city']?.toString() ?? addr['town']?.toString() ?? addr['county']?.toString();
          if (city != null) parts.add(city);
          final state = addr['state']?.toString();
          if (state != null) parts.add(state);
          if (country.isNotEmpty) parts.add(country);

          final address = parts.toSet().join(', ').isNotEmpty ? parts.toSet().join(', ') : displayName;
          final fullAddress = name.isNotEmpty
              ? (address.isNotEmpty && !address.toLowerCase().contains(name.toLowerCase())
                  ? '$name, $address'
                  : address)
              : address;

          final lat = double.tryParse(item['lat']?.toString() ?? '0') ?? 0.0;
          final lng = double.tryParse(item['lon']?.toString() ?? '0') ?? 0.0;

          if (lat != 0.0 || lng != 0.0) {
            final finalFull = fullAddress.isNotEmpty ? fullAddress : displayName;
            results.add(LocationSuggestion(
              name: name.isNotEmpty ? name : displayName,
              address: address,
              fullAddress: finalFull.length > 150 ? finalFull.substring(0, 150) : finalFull,
              country: country,
              lat: lat,
              lng: lng,
            ));
          }
        }
        return results;
      }
    } catch (e) {
      if (e is DioException && CancelToken.isCancel(e)) rethrow;
    }
    return [];
  }

  Future<List<LocationSuggestion>> searchLocations(
    String query, {
    CancelToken? cancelToken,
  }) async {
    final trimmed = query.trim();
    if (trimmed.length < 3) return [];

    try {
      // Stage 1: Concurrent fetch from Photon (India bias) and Nominatim (India filter)
      final results1 = await Future.wait([
        fetchPhoton(trimmed, biasIndia: true, cancelToken: cancelToken),
        fetchNominatim(trimmed, countryFilter: 'in', cancelToken: cancelToken),
      ]);

      final photonResults = results1[0];
      final nominatimIndiaResults = results1[1];

      final rawCandidates = deduplicateLocations([...photonResults, ...nominatimIndiaResults]);

      final scoredCandidates = rawCandidates.map((item) {
        final s = scoreLocationResult(item, trimmed);
        return MapEntry(item, s);
      }).toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      final hasStrongLocalResults = scoredCandidates.isNotEmpty && scoredCandidates.first.value >= 100;

      if (!hasStrongLocalResults) {
        // Stage 2: Fallback query appending "India" and global Nominatim
        final enrichedQuery = '$trimmed India';
        final results2 = await Future.wait([
          fetchPhoton(enrichedQuery, biasIndia: true, cancelToken: cancelToken),
          fetchNominatim(trimmed, countryFilter: null, cancelToken: cancelToken),
        ]);

        final fallbackPhoton = results2[0];
        final fallbackNominatimGlobal = results2[1];

        final additionalCandidates = deduplicateLocations([...fallbackPhoton, ...fallbackNominatimGlobal]);
        final allCandidates = deduplicateLocations([...rawCandidates, ...additionalCandidates]);

        final rescored = allCandidates.map((item) {
          final s = scoreLocationResult(item, trimmed);
          return MapEntry(item, s);
        }).toList()
          ..sort((a, b) => b.value.compareTo(a.value));

        final positiveScored = rescored.where((e) => e.value > 0).map((e) => e.key).toList();
        final finalResults = positiveScored.isNotEmpty ? positiveScored : rescored.map((e) => e.key).toList();

        return finalResults.take(8).toList();
      }

      final positiveScored = scoredCandidates.where((e) => e.value > 0).map((e) => e.key).toList();
      final finalResults = positiveScored.isNotEmpty ? positiveScored : scoredCandidates.map((e) => e.key).toList();

      return finalResults.take(8).toList();
    } catch (e) {
      if (e is DioException && CancelToken.isCancel(e)) rethrow;
      return [];
    }
  }
}
