import 'json_utils.dart';

/// User-facing theme preference, persisted as `theme_mode` in settings.json.
/// Default is LIGHT (classic white) — user decision 2026-10-31, overriding
/// MIGRATION_SPEC's original "dark default" note.
enum ThemePreference {
  light,
  dark,
  system;

  static ThemePreference fromWire(String? raw) {
    for (final p in ThemePreference.values) {
      if (p.name == raw) return p;
    }
    return light;
  }

  String get wire => name;
}

/// Per-origin base URLs + client prefs, persisted at
/// `$XDG_CONFIG_HOME/himvote/settings.json` (see lib/storage/).
class AppSettings {
  // Defaults match API_CONTRACT.md and the dev mock server.
  static const String defaultIdentity = 'http://localhost:8080';
  static const String defaultCasting = 'http://localhost:8081';
  static const String defaultWitness = 'http://localhost:8082';

  final String identityOrigin;
  final String castingOrigin;
  final String witnessOrigin;
  final bool highContrast; // WCAG 2.1 AAA
  final ThemePreference themePreference;

  const AppSettings({
    required this.identityOrigin,
    required this.castingOrigin,
    required this.witnessOrigin,
    this.highContrast = false,
    this.themePreference = ThemePreference.light,
  });

  factory AppSettings.defaults() => const AppSettings(
        identityOrigin: defaultIdentity,
        castingOrigin: defaultCasting,
        witnessOrigin: defaultWitness,
        highContrast: false,
        themePreference: ThemePreference.light,
      );

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    // Migrate the pre-2026-11 settings key (dark_mode_default) if present.
    final legacyDark = json['dark_mode_default'] == true;
    return AppSettings(
      identityOrigin: asStringOr(json, 'identity_origin', defaultIdentity),
      castingOrigin: asStringOr(json, 'casting_origin', defaultCasting),
      witnessOrigin: asStringOr(json, 'witness_origin', defaultWitness),
      highContrast: asBool(json, 'high_contrast'),
      themePreference: json['theme_mode'] != null
          ? ThemePreference.fromWire(asString(json, 'theme_mode'))
          : (legacyDark ? ThemePreference.dark : ThemePreference.light),
    );
  }

  Map<String, dynamic> toJson() => {
        'identity_origin': identityOrigin,
        'casting_origin': castingOrigin,
        'witness_origin': witnessOrigin,
        'high_contrast': highContrast,
        'theme_mode': themePreference.wire,
      };

  AppSettings copyWith({
    String? identityOrigin,
    String? castingOrigin,
    String? witnessOrigin,
    bool? highContrast,
    ThemePreference? themePreference,
  }) =>
      AppSettings(
        identityOrigin: identityOrigin ?? this.identityOrigin,
        castingOrigin: castingOrigin ?? this.castingOrigin,
        witnessOrigin: witnessOrigin ?? this.witnessOrigin,
        highContrast: highContrast ?? this.highContrast,
        themePreference: themePreference ?? this.themePreference,
      );

  @override
  bool operator ==(Object other) =>
      other is AppSettings &&
      other.identityOrigin == identityOrigin &&
      other.castingOrigin == castingOrigin &&
      other.witnessOrigin == witnessOrigin &&
      other.highContrast == highContrast &&
      other.themePreference == themePreference;

  @override
  int get hashCode => Object.hash(identityOrigin, castingOrigin, witnessOrigin,
      highContrast, themePreference);
}

/// A trusted witness key-pin the user has explicitly accepted.
class TrustPin {
  final String origin; // e.g. http://localhost:8082
  final String keyFingerprint;
  final String label;
  final DateTime pinnedAt;

  const TrustPin({
    required this.origin,
    required this.keyFingerprint,
    this.label = '',
    required this.pinnedAt,
  });

  factory TrustPin.fromJson(Map<String, dynamic> json) => TrustPin(
        origin: asStringOr(json, 'origin', ''),
        keyFingerprint: asStringOr(json, 'key_fingerprint', ''),
        label: asStringOr(json, 'label', ''),
        pinnedAt: parseIso(json['pinned_at']) ?? DateTime.now().toUtc(),
      );

  Map<String, dynamic> toJson() => {
        'origin': origin,
        'key_fingerprint': keyFingerprint,
        'label': label,
        'pinned_at': isoString(pinnedAt),
      };
}
