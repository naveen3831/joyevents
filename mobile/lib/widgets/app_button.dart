import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_theme.dart';

/// Gradient primary button — mirrors React's bg-gradient-primary button:
///   linear-gradient(135deg, #5B21B6 → #FF6B8B), white text, arrow icon
class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isOutlined;
  final IconData? icon;
  final bool showArrow;
  final Color? color;

  const AppButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.isOutlined = false,
    this.icon,
    this.showArrow = true,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    if (isOutlined) {
      return SizedBox(
        width: double.infinity,
        height: 52,
        child: OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: color ?? AppTheme.primaryColor, width: 1.5),
            foregroundColor: color ?? AppTheme.primaryColor,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          child: isLoading
              ? SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: color ?? AppTheme.primaryColor,
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 18),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      text,
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
        ),
      );
    }

    // ── Gradient primary button ──────────────────────────────
    final gradient = color != null
        ? LinearGradient(colors: [color!, color!])
        : AppTheme.gradientPrimary;

    return SizedBox(
      width: double.infinity,
      height: 52,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(14),
            boxShadow: AppTheme.glowShadow,
          ),
          child: InkWell(
            onTap: isLoading ? null : onPressed,
            borderRadius: BorderRadius.circular(14),
            splashColor: Colors.white.withOpacity(0.1),
            highlightColor: Colors.white.withOpacity(0.05),
            child: Center(
              child: isLoading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (icon != null) ...[
                          Icon(icon, size: 18, color: Colors.white),
                          const SizedBox(width: 8),
                        ],
                        Text(
                          text,
                          style: GoogleFonts.poppins(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        if (showArrow) ...[
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.arrow_forward_rounded,
                            size: 18,
                            color: Colors.white,
                          ),
                        ],
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
