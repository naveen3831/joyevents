import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../config/app_theme.dart';

/// Centralized reusable remote network image widget for JoyEvents mobile app.
/// Safely renders remote HTTPS / Cloudinary images, relative backend paths,
/// loading states, error fallbacks, and custom BoxFit / BorderRadii with zero layout jumping.
class AppNetworkImage extends StatelessWidget {
  final String? url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final Widget? errorWidget;
  final Widget? loadingWidget;
  final Color? backgroundColor;

  const AppNetworkImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.errorWidget,
    this.loadingWidget,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final resolvedUrl = ApiConfig.resolveImageUrl(url);

    Widget content;

    if (resolvedUrl.isEmpty) {
      content = errorWidget ?? _buildDefaultErrorFallback();
    } else {
      content = Image.network(
        resolvedUrl,
        width: width,
        height: height,
        fit: fit,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return loadingWidget ?? _buildDefaultLoadingPlaceholder();
        },
        errorBuilder: (context, error, stackTrace) {
          return errorWidget ?? _buildDefaultErrorFallback();
        },
      );
    }

    if (borderRadius != null) {
      return ClipRRect(
        borderRadius: borderRadius!,
        child: Container(
          width: width,
          height: height,
          color: backgroundColor ?? Colors.grey.shade100,
          child: content,
        ),
      );
    }

    return Container(
      width: width,
      height: height,
      color: backgroundColor ?? Colors.grey.shade100,
      child: content,
    );
  }

  Widget _buildDefaultLoadingPlaceholder() {
    return Container(
      width: width,
      height: height,
      color: Colors.grey.shade100,
      child: Center(
        child: SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor.withOpacity(0.6)),
          ),
        ),
      ),
    );
  }

  Widget _buildDefaultErrorFallback() {
    return Container(
      width: width,
      height: height,
      color: Colors.grey.shade100,
      child: Center(
        child: Icon(
          Icons.image_not_supported_outlined,
          size: (height != null && height! < 60) ? 20 : 32,
          color: Colors.grey.shade400,
        ),
      ),
    );
  }
}
