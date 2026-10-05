class CategoryModel {
  final String id;
  final String name;
  final String type;
  final String? imageUrl;
  final String? imagePublicId;

  CategoryModel({
    required this.id,
    required this.name,
    required this.type,
    this.imageUrl,
    this.imagePublicId,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      type: json['type']?.toString() ?? 'event',
      imageUrl: json['imageUrl']?.toString(),
      imagePublicId: json['imagePublicId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'type': type,
      'imageUrl': imageUrl,
      'imagePublicId': imagePublicId,
    };
  }
}
