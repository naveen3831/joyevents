import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/api_config.dart';
import '../config/app_theme.dart';
import '../models/service_model.dart';

/// Redesigned compact mobile ServiceCard.
///
/// Hierarchy (Top → Bottom):
///   1. Image (105px, cover) + Category Badge (top-left)
///   2. Service Title (max 2 lines)
///   3. Short Description preview (max 2 lines, single flow text, no bullet points)
///   4. From ₹Price
///   5. Book Now Gradient Button (Purple → Pink, 40px height)
class ServiceCard extends StatelessWidget {
  final ServiceModel service;
  final VoidCallback onTap;

  const ServiceCard({
    super.key,
    required this.service,
    required this.onTap,
  });

  /// Extracts a single clean short description string preview.
  /// Removes bullet points, newlines, or dummy/N/A values.
  String? _getShortDescription(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    final clean = trimmed
        .replaceAll(RegExp(r'[\n;•\r]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    if (clean.isEmpty ||
        clean.toLowerCase() == 'n/a' ||
        clean.toLowerCase() == 'null' ||
        clean.toLowerCase() == 'undefined' ||
        clean.toLowerCase() == 'no description available') {
      return null;
    }
    return clean;
  }

  /// Formats currency: 7999 -> "7,999"
  String _formatCurrency(double price) {
    final numStr = price.toStringAsFixed(0);
    final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return numStr.replaceAllMapped(reg, (Match m) => '${m[1]},');
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: AppTheme.tintVioletBg,
      child: const Center(
        child: Icon(
          Icons.design_services_outlined,
          size: 30,
          color: AppTheme.primaryColor,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = ApiConfig.resolveImageUrl(service.mainImage);
    final shortDesc = _getShortDescription(service.description);

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderColor, width: 1),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF060B28).withOpacity(0.05),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
            color: Colors.white,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. IMAGE WITH CATEGORY BADGE (Fixed 105px height)
              SizedBox(
                height: 105,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                _buildImagePlaceholder(),
                          )
                        : _buildImagePlaceholder(),

                    // Category Badge (Top-Left)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.92),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: AppTheme.primaryColor.withOpacity(0.2),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.06),
                              blurRadius: 4,
                            ),
                          ],
                        ),
                        child: Text(
                          service.category,
                          style: GoogleFonts.poppins(
                            color: AppTheme.primaryColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // 2. CARD CONTENT
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Top Section: Title & Short Description
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            service.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textColor,
                              height: 1.2,
                            ),
                          ),
                          if (shortDesc != null) ...[
                            const SizedBox(height: 3),
                            Text(
                              shortDesc,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.poppins(
                                fontSize: 11,
                                color: AppTheme.subtitleColor,
                                height: 1.3,
                              ),
                            ),
                          ],
                        ],
                      ),

                      // Bottom Section: Price & Book Now CTA Button
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'From ₹${_formatCurrency(service.price)}',
                            style: GoogleFonts.poppins(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 40,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              gradient: AppTheme.gradientPrimary,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primaryColor.withOpacity(0.22),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: onTap,
                                borderRadius: BorderRadius.circular(8),
                                splashColor: Colors.white.withOpacity(0.15),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.shopping_bag_outlined,
                                      size: 14,
                                      color: Colors.white,
                                    ),
                                    const SizedBox(width: 5),
                                    Text(
                                      'Book Now',
                                      style: GoogleFonts.poppins(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
