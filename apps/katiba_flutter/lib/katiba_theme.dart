import 'package:flutter/material.dart';

abstract final class KatibaColors {
  static const ink = Color(0xFF122832);
  static const deepGreen = Color(0xFF123F36);
  static const green = Color(0xFF2F8564);
  static const mint = Color(0xFFDDEFE8);
  static const ivory = Color(0xFFF7F4EC);
  static const paper = Color(0xFFFFFDF8);
  static const gold = Color(0xFFC9902D);
  static const sand = Color(0xFFF2E5C9);
  static const slate = Color(0xFF5E7078);
  static const border = Color(0xFFD8E0DD);
  static const danger = Color(0xFFA74D36);
}

ThemeData buildKatibaTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: KatibaColors.green,
    brightness: Brightness.light,
    primary: KatibaColors.green,
    secondary: KatibaColors.gold,
    surface: KatibaColors.paper,
    error: KatibaColors.danger,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: KatibaColors.ivory,
    fontFamily: 'Georgia',
    textTheme: const TextTheme(
      displaySmall: TextStyle(
        fontSize: 42,
        height: 1.05,
        fontWeight: FontWeight.w700,
        color: KatibaColors.ink,
      ),
      headlineMedium: TextStyle(
        fontSize: 30,
        height: 1.1,
        fontWeight: FontWeight.w700,
        color: KatibaColors.ink,
      ),
      headlineSmall: TextStyle(
        fontSize: 23,
        height: 1.15,
        fontWeight: FontWeight.w700,
        color: KatibaColors.ink,
      ),
      titleLarge: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: KatibaColors.ink,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: KatibaColors.ink,
      ),
      bodyLarge: TextStyle(
        fontFamily: 'Arial',
        fontSize: 16,
        height: 1.45,
        color: KatibaColors.ink,
      ),
      bodyMedium: TextStyle(
        fontFamily: 'Arial',
        fontSize: 14,
        height: 1.4,
        color: KatibaColors.slate,
      ),
      labelLarge: TextStyle(fontFamily: 'Arial', fontWeight: FontWeight.w700),
      labelMedium: TextStyle(
        fontFamily: 'Arial',
        fontWeight: FontWeight.w700,
        letterSpacing: .5,
      ),
    ),
    cardTheme: const CardThemeData(
      color: KatibaColors.paper,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: KatibaColors.border),
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
    ),
    inputDecorationTheme: const InputDecorationTheme(
      filled: true,
      fillColor: KatibaColors.paper,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(14)),
        borderSide: BorderSide(color: KatibaColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(14)),
        borderSide: BorderSide(color: KatibaColors.border),
      ),
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 15),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: KatibaColors.green,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
  );
}
