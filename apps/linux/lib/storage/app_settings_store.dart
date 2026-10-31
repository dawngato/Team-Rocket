import 'dart:convert';

import '../models/app_settings.dart';
import 'file_store.dart';

/// Persists AppSettings at $XDG_CONFIG_HOME/himvote/settings.json.
/// Corrupt or missing files degrade to defaults — never crash the app.
class AppSettingsStore {
  final FileStore _config;

  const AppSettingsStore(this._config);

  static const fileName = 'settings.json';

  Future<AppSettings> load() async {
    final raw = await _config.read(fileName);
    if (raw == null || raw.trim().isEmpty) return AppSettings.defaults();
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return AppSettings.defaults();
      return AppSettings.fromJson(decoded);
    } catch (_) {
      return AppSettings.defaults();
    }
  }

  Future<void> save(AppSettings settings) =>
      _config.write(fileName, jsonEncode(settings.toJson()));
}
