import 'package:flutter/material.dart';

/// Centralized category-to-image mapper for JoyEvents mobile application.
/// Maps backend/UI category strings to local asset paths in `assets/images/categories/`.
class CategoryImageMapper {
  static const String _categoriesBasePath = 'assets/images/categories/';

  /// Normalized mapping of category keys (lowercase, trimmed) to asset image paths.
  /// Prefers exact local asset filenames (.jpg / .png).
  static const Map<String, String> _categoryImageMap = {
    'all': '${_categoriesBasePath}all.jpg',
    'all events': '${_categoriesBasePath}all.jpg',
    'all services': '${_categoriesBasePath}all.jpg',
    'music': '${_categoriesBasePath}music.jpg',
    'wedding': '${_categoriesBasePath}wedding.jpg',
    'wedding services': '${_categoriesBasePath}wedding.jpg',
    'corporate': '${_categoriesBasePath}corporate.jpg',
    'catering': '${_categoriesBasePath}catering.jpg',
    'photography': '${_categoriesBasePath}photography.jpg',
    'birthday': '${_categoriesBasePath}birthday.jpg',
    'sports': '${_categoriesBasePath}sports.jpg',
    'cricket': '${_categoriesBasePath}cricket.jpg',
    'festival': '${_categoriesBasePath}festival.jpg',
    'decoration': '${_categoriesBasePath}decoration.jpg',
    'venue': '${_categoriesBasePath}venue.jpg',
    'makeup': '${_categoriesBasePath}makeup.jpg',
    'dj': '${_categoriesBasePath}music.jpg',
    'transport': '${_categoriesBasePath}transport.jpg',
  };

  /// Returns the registered asset image path for a category name (if mapped).
  /// Safely normalizes casing and trimming.
  /// Returns `null` if no custom image asset has been supplied yet,
  /// allowing the `CategoryImageCard` component to gracefully render a branded fallback.
  static String? getAssetPath(String category) {
    final key = category.trim().toLowerCase();
    if (_categoryImageMap.containsKey(key)) {
      return _categoryImageMap[key];
    }
    // Partial key matching for variations like "Wedding Photographer" -> "photography"
    for (final entry in _categoryImageMap.entries) {
      if (key.contains(entry.key) || entry.key.contains(key)) {
        return entry.value;
      }
    }
    return null;
  }

  /// Returns a complementary Material Icon for fallback brand cards.
  static IconData getCategoryIcon(String category) {
    final key = category.trim().toLowerCase();
    if (key == 'all' || key == 'all events' || key == 'all services') {
      return Icons.grid_view_rounded;
    }
    if (key.contains('music') || key == 'dj') {
      return Icons.music_note_rounded;
    }
    if (key.contains('wedding')) {
      return Icons.favorite_rounded;
    }
    if (key.contains('corporate') || key.contains('business')) {
      return Icons.business_center_rounded;
    }
    if (key.contains('birthday') || key.contains('party')) {
      return Icons.cake_rounded;
    }
    if (key.contains('sport') || key.contains('game')) {
      return Icons.sports_soccer_rounded;
    }
    if (key.contains('cricket')) {
      return Icons.sports_cricket_rounded;
    }
    if (key.contains('cater') || key.contains('food')) {
      return Icons.restaurant_rounded;
    }
    if (key.contains('festiv')) {
      return Icons.festival_rounded;
    }
    if (key.contains('photo') || key.contains('camera')) {
      return Icons.camera_alt_rounded;
    }
    if (key.contains('decor')) {
      return Icons.auto_awesome_rounded;
    }
    if (key.contains('venue') || key.contains('location')) {
      return Icons.location_city_rounded;
    }
    if (key.contains('makeup') || key.contains('beauty')) {
      return Icons.face_retouching_natural_rounded;
    }
    if (key.contains('transport') || key.contains('travel')) {
      return Icons.directions_car_rounded;
    }
    return Icons.category_rounded;
  }
}
