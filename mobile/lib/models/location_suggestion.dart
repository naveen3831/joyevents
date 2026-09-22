class LocationSuggestion {
  final String name;
  final String address;
  final String fullAddress;
  final String country;
  final double lat;
  final double lng;
  final bool isManual;

  LocationSuggestion({
    required this.name,
    required this.address,
    required this.fullAddress,
    this.country = '',
    required this.lat,
    required this.lng,
    this.isManual = false,
  });

  factory LocationSuggestion.fromJson(Map<String, dynamic> json) {
    return LocationSuggestion(
      name: json['name']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      fullAddress: json['fullAddress']?.toString() ?? '',
      country: json['country']?.toString() ?? '',
      lat: (json['lat'] is num) ? (json['lat'] as num).toDouble() : double.tryParse(json['lat']?.toString() ?? '0') ?? 0.0,
      lng: (json['lng'] is num) ? (json['lng'] as num).toDouble() : double.tryParse(json['lng']?.toString() ?? '0') ?? 0.0,
      isManual: json['isManual'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'address': address,
      'fullAddress': fullAddress,
      'country': country,
      'lat': lat,
      'lng': lng,
      'isManual': isManual,
    };
  }
}
