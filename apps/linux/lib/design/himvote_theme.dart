import 'package:flutter/material.dart';

/// Theme builder for HimVote.
///
/// Three schemes, user decision 2026-10-31: the DEFAULT is a simple classic
/// WHITE theme; dark mode is available via the shell sun/moon toggle; the
/// WCAG 2.1 AAA high-contrast overlay (Ctrl+H) works on top of either.
/// (Overrides MIGRATION_SPEC's original "dark default" wording.)
class HimVoteTheme {
  static const Color seed = Color(0xFF3949AB);

  // --- classic light (default) ----------------------------------------------
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightOnSurface = Color(0xFF1A1A1A);
  static const Color lightOnSurfaceVariant = Color(0xFF49454F);
  static const Color lightContainer = Color(0xFFF4F3FA); // subtle tinted card bg

  // --- WCAG AAA (high contrast) ----------------------------------------------
  static const Color hcBackground = Color(0xFF000000);
  static const Color hcOn = Color(0xFFFFFFFF);
  static const Color hcPrimary = Color(0xFFFFFF00); // yellow on black
  static const Color hcSecondary = Color(0xFF00E5FF);
  static const Color hcError = Color(0xFFFF5252);
  static const Color hcContainer = Color(0xFF1A1A1A);

  static ThemeData build({required bool dark, required bool highContrast}) {
    if (highContrast) return _highContrast();
    return dark ? _dark() : _light();
  }

  static ThemeData _light() {
    final base = ColorScheme.fromSeed(seedColor: seed, brightness: Brightness.light);
    final scheme = base.copyWith(
      surface: lightSurface,
      onSurface: lightOnSurface,
      onSurfaceVariant: lightOnSurfaceVariant,
      surfaceContainer: lightSurface,
      surfaceContainerHighest: lightContainer,
      outline: const Color(0xFF79747E),
      outlineVariant: const Color(0xFF79747E).withValues(alpha: 0.5),
    );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: scheme,
      scaffoldBackgroundColor: lightSurface,
      appBarTheme: const AppBarTheme(
        backgroundColor: lightSurface,
        foregroundColor: lightOnSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0.5,
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: lightSurface,
        indicatorColor: scheme.secondaryContainer,
        selectedIconTheme: IconThemeData(color: scheme.onSecondaryContainer),
        selectedLabelTextStyle: TextStyle(
            color: scheme.onSurface, fontWeight: FontWeight.w600),
      ),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant),
      cardTheme: CardThemeData(
        color: lightSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: scheme.inverseSurface,
        contentTextStyle: TextStyle(color: scheme.onInverseSurface),
      ),
    );
  }

  static ThemeData _dark() {
    final scheme = ColorScheme.fromSeed(seedColor: seed, brightness: Brightness.dark);
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surfaceContainer,
        surfaceTintColor: Colors.transparent,
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: scheme.surfaceContainer,
        indicatorColor: scheme.secondaryContainer,
        selectedIconTheme: IconThemeData(color: scheme.onSecondaryContainer),
      ),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        showCloseIcon: true,
      ),
    );
  }

  static ThemeData _highContrast() {
    const scheme = ColorScheme.dark(
      primary: hcPrimary,
      onPrimary: hcBackground,
      secondary: hcSecondary,
      onSecondary: hcBackground,
      surface: hcBackground,
      onSurface: hcOn,
      onSurfaceVariant: hcOn,
      surfaceContainer: hcContainer,
      surfaceContainerHighest: hcContainer,
      outline: hcOn,
      outlineVariant: hcOn,
      error: hcError,
      onError: hcBackground,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: hcBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: hcBackground,
        foregroundColor: hcOn,
        surfaceTintColor: Colors.transparent,
      ),
      dividerTheme: const DividerThemeData(color: hcOn),
      navigationRailTheme: const NavigationRailThemeData(
        backgroundColor: hcBackground,
        indicatorColor: hcPrimary,
        selectedIconTheme: IconThemeData(color: hcBackground),
        selectedLabelTextStyle: TextStyle(color: hcOn, fontWeight: FontWeight.bold),
      ),
      cardTheme: CardThemeData(
        color: hcBackground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: hcOn, width: 2),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: hcPrimary,
        contentTextStyle: TextStyle(color: hcBackground, fontWeight: FontWeight.bold),
      ),
    );
  }
}
