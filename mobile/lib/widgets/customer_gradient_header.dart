import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/app_theme.dart';
import '../services/cart_service.dart';

/// Reusable compact gradient header component for main Customer pages in JoyEvents.
/// Features the brand purple -> pink gradient, subtle rounded bottom corners (24px),
/// status bar integration, and vertically centered title and action icons.
class CustomerGradientHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final bool showBack;
  final VoidCallback? onBack;
  final List<Widget>? actions;
  final bool showCartAndNotifications;
  final Widget? child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;

  const CustomerGradientHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.showBack = false,
    this.onBack,
    this.actions,
    this.showCartAndNotifications = true,
    this.child,
    this.padding,
    this.borderRadius = 28.0,
  });

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    final cartService = CartService();

    List<Widget> effectiveActions = actions ?? [];
    if (actions == null && showCartAndNotifications) {
      effectiveActions = [
        // Cart Icon with Badge
        ListenableBuilder(
          listenable: cartService,
          builder: (context, _) {
            final count = cartService.itemCount;
            return Stack(
              alignment: Alignment.center,
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 38, minHeight: 38),
                  icon: const Icon(
                    Icons.shopping_bag_outlined,
                    color: Colors.white,
                    size: 25,
                  ),
                  onPressed: () => context.push('/customer/cart'),
                ),
                if (count > 0)
                  Positioned(
                    right: 2,
                    top: 2,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: AppTheme.accentColor,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        '$count',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        const SizedBox(width: 4),
        // Notification Bell Icon
        IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 38, minHeight: 38),
          icon: const Icon(
            Icons.notifications_none_rounded,
            color: Colors.white,
            size: 25,
          ),
          onPressed: () => context.push('/customer/notifications'),
        ),
      ];
    }

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [
              Color(0xFF4C1D95), // deep purple
              Color(0xFF7C3AED), // mid purple
              Color(0xFFDB2777), // magenta
              Color(0xFFFF6B8B), // soft pink
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.only(
            bottomLeft: Radius.circular(borderRadius),
            bottomRight: Radius.circular(borderRadius),
          ),
        ),
        child: Padding(
          padding: padding ??
              EdgeInsets.only(
                top: topPadding + 10,
                left: 20,
                right: 12,
                bottom: child != null ? 18 : 16,
              ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  if (showBack) ...[
                    IconButton(
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                      icon: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                      onPressed: onBack ??
                          () {
                            if (Navigator.canPop(context)) {
                              Navigator.pop(context);
                            } else {
                              context.go('/customer/home');
                            }
                          },
                    ),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: Text(
                      title,
                      style: GoogleFonts.poppins(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        height: 1.1,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (effectiveActions.isNotEmpty)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: effectiveActions,
                    ),
                ],
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
              ],
              if (child != null) ...[
                const SizedBox(height: 14),
                child!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}

