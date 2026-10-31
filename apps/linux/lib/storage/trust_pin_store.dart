import 'dart:convert';

import '../models/app_settings.dart';
import 'file_store.dart';

/// Persists accepted witness key-pins at $XDG_CONFIG_HOME/himvote/pins.json
/// (MIGRATION_SPEC.md TrustPinStore). Pins are config, not ballot data.
class TrustPinStore {
  final FileStore _config;

  const TrustPinStore(this._config);

  static const fileName = 'pins.json';

  Future<List<TrustPin>> load() async {
    final raw = await _config.read(fileName);
    if (raw == null || raw.trim().isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return const [];
      final pins = (decoded['pins'] as List?) ?? const [];
      return pins
          .whereType<Map<String, dynamic>>()
          .map(TrustPin.fromJson)
          .toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> save(List<TrustPin> pins) =>
      _config.write(fileName, jsonEncode({'version': 1, 'pins': pins}));

  Future<List<TrustPin>> add(TrustPin pin) async {
    final pins = await load();
    final updated = [
      pin,
      ...pins.where((p) => p.keyFingerprint != pin.keyFingerprint),
    ];
    await save(updated);
    return updated;
  }
}
