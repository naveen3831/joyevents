class ServiceModel {
  final String id;
  final String name;
  final String description;
  final String category;
  final double price;
  final List<String> images;
  final String location;
  final String? createdByName;
  final String? createdById;
  final double averageRating;
  final int ratingCount;

  ServiceModel({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.price,
    required this.images,
    required this.location,
    this.createdByName,
    this.createdById,
    this.averageRating = 0.0,
    this.ratingCount = 0,
  });

  factory ServiceModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedImages = [];
    if (json['images'] is List) {
      parsedImages = (json['images'] as List)
          .map((e) => e.toString())
          .where((e) => e.isNotEmpty)
          .toList();
    } else if (json['image'] != null && json['image'].toString().isNotEmpty) {
      parsedImages = [json['image'].toString()];
    }

    String? cName;
    String? cId;
    if (json['createdBy'] is Map) {
      cName = json['createdBy']['name']?.toString();
      cId = json['createdBy']['_id']?.toString();
    } else if (json['createdBy'] != null) {
      cId = json['createdBy'].toString();
    }

    return ServiceModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? json['serviceName']?.toString() ?? 'Service',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      images: parsedImages,
      location: json['location']?.toString() ?? '',
      createdByName: cName,
      createdById: cId,
      averageRating: (json['averageRating'] is num)
          ? (json['averageRating'] as num).toDouble()
          : 0.0,
      ratingCount: (json['ratingCount'] is num)
          ? (json['ratingCount'] as num).toInt()
          : 0,
    );
  }

  String get mainImage => images.isNotEmpty ? images.first : '';
}
