import 'package:flutter/material.dart';

import 'api/linux_api_client.dart';
import 'design/himvote_theme.dart';
import 'models/app_settings.dart';
import 'screens/nav_shell.dart';
import 'storage/app_settings_store.dart';
import 'storage/receipt_store.dart';
import 'storage/storage_backend.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Same XDG paths the tkinter app used (MIGRATION_SPEC.md storage rule):
  // config under $XDG_CONFIG_HOME/himvote, data under $XDG_DATA_HOME/himvote.
  final stores = PlatformStores.create();
  final settingsStore = AppSettingsStore(stores.config);
  final settings = await settingsStore.load();
  final client = LinuxApiClient(settings: settings);
  final walletStore = ReceiptWalletStore(stores.data);
  runApp(HimVoteApp(
    initialSettings: settings,
    settingsStore: settingsStore,
    client: client,
    walletStore: walletStore,
  ));
}

class HimVoteApp extends StatefulWidget {
  const HimVoteApp({
    super.key,
    this.initialSettings,
    this.settingsStore,
    this.client,
    this.walletStore,
  });

  final AppSettings? initialSettings;
  final AppSettingsStore? settingsStore;
  final LinuxApiClient? client;
  final ReceiptWalletStore? walletStore;

  @override
  State<HimVoteApp> createState() => _HimVoteAppState();
}

class _HimVoteAppState extends State<HimVoteApp> {
  late final ValueNotifier<bool> _highContrast =
      ValueNotifier(widget.initialSettings?.highContrast ?? false);
  late final ValueNotifier<ThemePreference> _themePreference =
      ValueNotifier(widget.initialSettings?.themePreference ?? ThemePreference.light);

  @override
  void dispose() {
    _highContrast.dispose();
    _themePreference.dispose();
    super.dispose();
  }

  ThemeMode get _themeMode => switch (_themePreference.value) {
        ThemePreference.light => ThemeMode.light,
        ThemePreference.dark => ThemeMode.dark,
        ThemePreference.system => ThemeMode.system,
      };

  void _persist(AppSettings updated) {
    final store = widget.settingsStore;
    final settings = widget.initialSettings;
    if (store != null && settings != null) {
      // Fire-and-forget; a failed save must not break the toggle itself.
      store.save(updated);
    }
  }

  void _onContrastChanged(bool enabled) {
    _highContrast.value = enabled;
    final settings = widget.initialSettings;
    if (settings != null) {
      _persist(settings.copyWith(highContrast: enabled));
    }
  }

  void _onThemeChanged(ThemePreference preference) {
    _themePreference.value = preference;
    final settings = widget.initialSettings;
    if (settings != null) {
      _persist(settings.copyWith(themePreference: preference));
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePreference>(
      valueListenable: _themePreference,
      builder: (context, preference, _) => ValueListenableBuilder<bool>(
        valueListenable: _highContrast,
        builder: (context, highContrast, _) => MaterialApp(
          title: 'HimVote',
          debugShowCheckedModeBanner: false,
          theme: HimVoteTheme.build(dark: false, highContrast: highContrast),
          darkTheme: HimVoteTheme.build(dark: true, highContrast: highContrast),
          themeMode: _themeMode,
          home: NavShell(
            highContrast: highContrast,
            onContrastChanged: _onContrastChanged,
            themePreference: preference,
            onThemeChanged: _onThemeChanged,
            client: widget.client,
            walletStore: widget.walletStore,
            settings: widget.initialSettings,
            settingsStore: widget.settingsStore,
          ),
        ),
      ),
    );
  }
}

