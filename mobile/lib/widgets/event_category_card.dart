import 'package:flutter/material.dart';
import 'category_image_card.dart';

/// Legacy alias for [CategoryImageCard].
/// Preserves backward compatibility while standardizing on [CategoryImageCard].
class EventCategoryCard extends StatelessWidget {
  final String category;
  final String? imageAssetPath;
  final bool isSelected;
  final VoidCallback onTap;
  final double width;
  final double height;
  final String allLabel;

  const EventCategoryCard({
    super.key,
    required this.category,
    this.imageAssetPath,
    required this.isSelected,
    required this.onTap,
    this.width = 110,
    this.height = 100,
    this.allLabel = 'All Events',
  });

  @override
  Widget build(BuildContext context) {
    return CategoryImageCard(
      title: category,
      imageAssetPath: imageAssetPath,
      isSelected: isSelected,
      onTap: onTap,
      width: width,
      height: height,
      allLabel: allLabel,
    );
  }
}
