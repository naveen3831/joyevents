import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/api_config.dart';
import '../config/app_theme.dart';
import '../models/service_model.dart';
import 'app_network_image.dart';

/// Compact, premium mobile ServiceCard.
///
/// Hierarchy (Top → Bottom):
///   1. Clean Image (95px height, cover) - NO text/badge overlay
///   2. Service Title (max 2 lines)
///   3. Starting Price ("From ₹X,XXX")
///   4. Book Now CTA Button (36px height)
class ServiceCard extends StatelessWidget {
  final ServiceModel service;
  final VoidCallback onTap;

  const ServiceCard({
    super.key,
    required this.service,
    required this.onTap,
  });

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
          size: 26,
          color: AppTheme.primaryColor,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.borderColor, width: 1),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF060B28).withOpacity(0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
            color: Colors.white,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. CLEAN SERVICE IMAGE (Fixed 95px height, NO overlay badge)
              SizedBox(
                height: 95,
                width: double.infinity,
                child: AppNetworkImage(
                  url: service.mainImage,
                  fit: BoxFit.cover,
                  errorWidget: _buildImagePlaceholder(),
                ),
              ),

              // 2. CARD CONTENT AREA
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Title & Price Section
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            service.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textColor,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'From ₹${_formatCurrency(service.price)}',
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ],
                      ),

                      // Book Now Button
                      Container(
                        height: 36,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          gradient: AppTheme.gradientPrimary,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryColor.withOpacity(0.2),
                              blurRadius: 4,
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
                                    fontSize: 11.5,
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
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

