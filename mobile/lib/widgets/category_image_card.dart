import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/app_theme.dart';
import '../utils/category_image_mapper.dart';
import 'app_network_image.dart';

/// Unified reusable image-based category card for Home, Browse Events, and Browse Services.
/// Features cover image cropped cleanly, dark bottom gradient overlay,
/// brand purple/pink selected state border & check badge, remote Cloudinary support & graceful fallback.
class CategoryImageCard extends StatelessWidget {
  final String title;
  final String? imageUrl;
  final String? imageAssetPath;
  final bool isSelected;
  final VoidCallback onTap;
  final double width;
  final double height;
  final String allLabel;

  const CategoryImageCard({
    super.key,
    required this.title,
    this.imageUrl,
    this.imageAssetPath,
    required this.isSelected,
    required this.onTap,
    this.width = 110,
    this.height = 100,
    this.allLabel = 'All',
  });

  @override
  Widget build(BuildContext context) {
    final cleanTitle = title.trim();
    final isAll = cleanTitle.toLowerCase() == 'all' ||
        cleanTitle.toLowerCase() == 'all events' ||
        cleanTitle.toLowerCase() == 'all services';

    final assetPath = imageAssetPath ?? CategoryImageMapper.getAssetPath(cleanTitle);
    final iconData = CategoryImageMapper.getCategoryIcon(cleanTitle);
    final displayTitle = isAll ? allLabel : cleanTitle;

    final fallbackWidget = isAll ? _buildAllEventsGradient(iconData) : _buildGradientFallback(iconData);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeInOut,
      width: width,
      height: height,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: AppTheme.primaryColor.withValues(alpha: 0.35),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ]
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          splashColor: AppTheme.primaryColor.withValues(alpha: 0.15),
          highlightColor: AppTheme.primaryColor.withValues(alpha: 0.08),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected ? AppTheme.primaryColor : Colors.grey.shade200,
                width: isSelected ? 2.5 : 1,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(isSelected ? 13.5 : 15),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // 1. Remote Cloudinary Image / Local Asset / Branded Fallback
                  if (imageUrl != null && imageUrl!.trim().isNotEmpty)
                    AppNetworkImage(
                      url: imageUrl,
                      fit: BoxFit.cover,
                      errorWidget: assetPath != null
                          ? Image.asset(
                              assetPath,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => fallbackWidget,
                            )
                          : fallbackWidget,
                    )
                  else if (assetPath != null)
                    Image.asset(
                      assetPath,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => fallbackWidget,
                    )
                  else
                    fallbackWidget,

                  // 2. Subtle Dark Gradient Overlay for Text Legibility
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.15),
                          Colors.black.withValues(alpha: 0.75),
                        ],
                        stops: const [0.35, 0.65, 1.0],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),

                  // 3. Category Title Label (Shown ONCE near bottom)
                  Positioned(
                    left: 6,
                    right: 6,
                    bottom: height < 95 ? 6 : 8,
                    child: Text(
                      displayTitle,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: height < 95 ? 11 : 12,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                        color: Colors.white,
                        shadows: const [
                          Shadow(
                            offset: Offset(0, 1),
                            blurRadius: 4,
                            color: Colors.black87,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // 4. Selected Indicator Check Badge
                  if (isSelected)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: AppTheme.primaryColor,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black26,
                              blurRadius: 4,
                              offset: Offset(0, 1),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.check_rounded,
                          size: 11,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Branded card design for "All" fallback
  Widget _buildAllEventsGradient(IconData iconData) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFF4C1D95), // deep purple
            Color(0xFF7C3AED), // mid purple
            Color(0xFFDB2777), // magenta
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Padding(
          padding: EdgeInsets.only(bottom: height < 95 ? 16 : 20),
          child: Container(
            padding: EdgeInsets.all(height < 95 ? 6 : 8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              iconData,
              size: height < 95 ? 20 : 24,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }

  /// Fallback card design when asset image is missing or not yet uploaded
  Widget _buildGradientFallback(IconData iconData) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF4C1D95).withValues(alpha: 0.88),
            const Color(0xFFDB2777).withValues(alpha: 0.88),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Padding(
          padding: EdgeInsets.only(bottom: height < 95 ? 14 : 18),
          child: Icon(
            iconData,
            size: height < 95 ? 22 : 26,
            color: Colors.white.withValues(alpha: 0.9),
          ),
        ),
      ),
    );
  }
}
