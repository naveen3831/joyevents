import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Eventoza / JoyEvents design system — mirrors the React web app's index.css
/// Source of truth: frontend/src/index.css + Login.jsx
class AppTheme {
  // ──────────────────────────────────────────────────────────
  // BRAND COLORS — extracted from React index.css :root vars
  // ──────────────────────────────────────────────────────────

  /// hsl(263 69% 42%) = #5B21B6 — primary purple
  static const Color primaryColor = Color(0xFF5B21B6);

  /// Darker purple for pressed states
  static const Color primaryDark = Color(0xFF4C1D95);

  /// hsl(347 100% 71%) = #FF6B8B — pink accent
  static const Color accentColor = Color(0xFFFF6B8B);

  /// hsl(220 45% 98%) = #F5F7FD — light lavender page background
  static const Color backgroundColor = Color(0xFFF5F7FD);

  /// Pure white card surface
  static const Color cardColor = Colors.white;

  /// hsl(211 53% 11%) = #0D1B2E — dark navy text
  static const Color textColor = Color(0xFF0D1B2E);

  /// hsl(220 15% 40%) = #536078 — muted/subtitle text
  static const Color subtitleColor = Color(0xFF536078);

  /// hsl(220 25% 88%) = #D8DEF0 — border color
  static const Color borderColor = Color(0xFFD8DEF0);

  /// hsl(220 35% 94%) = #EDF0F9 — input field fill (secondary/50)
  static const Color inputFillColor = Color(0xFFEDF0F9);

  /// hsl(142 71% 45%) = #22C55E — success green
  static const Color successColor = Color(0xFF22C55E);

  /// hsl(37 87% 69%) = #F59E0B — warning amber
  static const Color warningColor = Color(0xFFF59E0B);

  /// Red error
  static const Color errorColor = Color(0xFFEF4444);

  // ──────────────────────────────────────────────────────────
  // GRADIENTS — linear-gradient(135deg, #5B21B6 → #FF6B8B)
  // ──────────────────────────────────────────────────────────
  static const LinearGradient gradientPrimary = LinearGradient(
    colors: [Color(0xFF5B21B6), Color(0xFFFF6B8B)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient gradientPrimaryDiagonal = LinearGradient(
    colors: [Color(0xFF5B21B6), Color(0xFFFF6B8B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ──────────────────────────────────────────────────────────
  // TINT COLORS (for icon chips / category badges)
  // ──────────────────────────────────────────────────────────

  /// Orange tint (Ticketed events)
  static const Color tintOrangeBg = Color(0xFFFEF3EC);
  static const Color tintOrangeFg = Color(0xFFD97706);

  /// Pink tint (Professional merchants)
  static const Color tintPinkBg = Color(0xFFFDF2F7);
  static const Color tintPinkFg = Color(0xFFDB2777);

  /// Violet tint (Secure booking)
  static const Color tintVioletBg = Color(0xFFF5F0FE);
  static const Color tintVioletFg = Color(0xFF7C3AED);

  /// Blue tint
  static const Color tintBlueBg = Color(0xFFEFF6FF);
  static const Color tintBlueFg = Color(0xFF2563EB);

  // ──────────────────────────────────────────────────────────
  // SHADOWS — from React shadow-card / shadow-glow
  // ──────────────────────────────────────────────────────────
  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: const Color(0xFF060B28).withOpacity(0.10),
          blurRadius: 24,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get glowShadow => [
        BoxShadow(
          color: const Color(0xFF5B21B6).withOpacity(0.20),
          blurRadius: 40,
          offset: const Offset(0, 0),
        ),
      ];

  // ──────────────────────────────────────────────────────────
  // TYPOGRAPHY — Poppins (mirrors React --font-display/body)
  // ──────────────────────────────────────────────────────────
  static TextTheme get _poppinsTextTheme => GoogleFonts.poppinsTextTheme(
        const TextTheme(
          displayLarge: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w800,
            color: textColor,
            height: 1.2,
          ),
          displayMedium: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            color: textColor,
            height: 1.2,
          ),
          displaySmall: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: textColor,
            height: 1.3,
          ),
          headlineMedium: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
          headlineSmall: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
          titleLarge: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: textColor,
          ),
          titleMedium: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: textColor,
          ),
          bodyLarge: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w400,
            color: textColor,
          ),
          bodyMedium: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: textColor,
          ),
          bodySmall: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w400,
            color: subtitleColor,
          ),
          labelLarge: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: textColor,
          ),
          labelSmall: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: subtitleColor,
            letterSpacing: 0.5,
          ),
        ),
      );

  // ──────────────────────────────────────────────────────────
  // THEME
  // ──────────────────────────────────────────────────────────
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: backgroundColor,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        secondary: accentColor,
        surface: cardColor,
        error: errorColor,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
      ),
      textTheme: _poppinsTextTheme,
      // ── AppBar ──────────────────────────────────────────
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: borderColor.withOpacity(0.5),
        centerTitle: false,
        iconTheme: const IconThemeData(color: textColor),
        titleTextStyle: GoogleFonts.poppins(
          color: textColor,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),
      // ── Card ─────────────────────────────────────────────
      cardTheme: CardThemeData(
        color: cardColor,
        elevation: 0,
        shadowColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: borderColor, width: 1),
        ),
      ),
      // ── Elevated Button ───────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.poppins(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      // ── Outlined Button ───────────────────────────────────
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryColor,
          side: const BorderSide(color: primaryColor, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: GoogleFonts.poppins(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      // ── Text Button ───────────────────────────────────────
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryColor,
          textStyle: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      // ── Input Decoration ─────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: inputFillColor,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: primaryColor, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: errorColor),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: errorColor, width: 1.5),
        ),
        labelStyle: GoogleFonts.poppins(
          color: subtitleColor,
          fontSize: 14,
        ),
        hintStyle: GoogleFonts.poppins(
          color: const Color(0xFF94A3B8),
          fontSize: 14,
        ),
        prefixIconColor: subtitleColor,
        suffixIconColor: subtitleColor,
      ),
      // ── Chip ─────────────────────────────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: inputFillColor,
        selectedColor: primaryColor,
        labelStyle: GoogleFonts.poppins(fontSize: 13),
        side: const BorderSide(color: borderColor),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      // ── Divider ──────────────────────────────────────────
      dividerTheme: const DividerThemeData(
        color: borderColor,
        thickness: 1,
        space: 1,
      ),
      // ── Bottom Nav ───────────────────────────────────────
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: primaryColor,
        unselectedItemColor: const Color(0xFF94A3B8),
        selectedLabelStyle: GoogleFonts.poppins(
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
        unselectedLabelStyle: GoogleFonts.poppins(
          fontSize: 12,
          fontWeight: FontWeight.w400,
        ),
        elevation: 0,
        type: BottomNavigationBarType.fixed,
      ),
      // ── Progress Indicator ───────────────────────────────
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: primaryColor,
      ),
    );
  }
}
