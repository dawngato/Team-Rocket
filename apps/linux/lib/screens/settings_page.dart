import 'package:flutter/material.dart';

import '../api/linux_api_client.dart';
import '../design/toast_notification.dart';
import '../models/app_settings.dart';
import '../storage/app_settings_store.dart';
import '../storage/storage_backend.dart';
import '../storage/trust_pin_store.dart';

/// Settings: three origin URLs, latency ping, and the Trust Pin store.
class SettingsPage extends StatefulWidget {
  const SettingsPage({
    super.key,
    required this.client,
    required this.settings,
    required this.settingsStore,
    this.pinStore,
    this.onSettingsSaved,
  });

  final LinuxApiClient client;
  final AppSettings settings;
  final AppSettingsStore settingsStore;

  /// Injectable for tests; defaults to the platform config store
  /// (`$XDG_CONFIG_HOME/himvote/pins.json`).
  final TrustPinStore? pinStore;

  /// Called after a successful save so the shell can hot-reconfigure the
  /// API client's origin URLs.
  final ValueChanged<AppSettings>? onSettingsSaved;

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  late final TextEditingController _identity;
  late final TextEditingController _casting;
  late final TextEditingController _witness;
  final _pinOrigin = TextEditingController();
  final _pinFingerprint = TextEditingController();

  late final TrustPinStore _pinStore =
      widget.pinStore ?? TrustPinStore(PlatformStores.create().config);

  List<TrustPin> _pins = const [];
  bool _pingBusy = false;
  bool _pinBusy = false;
  Map<OriginKind, Duration?>? _latencies;

  @override
  void initState() {
    super.initState();
    _identity = TextEditingController(text: widget.settings.identityOrigin);
    _casting = TextEditingController(text: widget.settings.castingOrigin);
    _witness = TextEditingController(text: widget.settings.witnessOrigin);
    _reloadPins();
  }

  @override
  void dispose() {
    _identity.dispose();
    _casting.dispose();
    _witness.dispose();
    _pinOrigin.dispose();
    _pinFingerprint.dispose();
    super.dispose();
  }

  Future<void> _reloadPins() async {
    final pins = await _pinStore.load();
    if (mounted) setState(() => _pins = pins);
  }

  Future<void> _save() async {
    final updated = widget.settings.copyWith(
      identityOrigin: _identity.text.trim(),
      castingOrigin: _casting.text.trim(),
      witnessOrigin: _witness.text.trim(),
    );
    await widget.settingsStore.save(updated);
    widget.onSettingsSaved?.call(updated);
    if (!mounted) return;
    showToast(context, 'Settings saved', kind: ToastKind.success);
  }

  Future<void> _ping() async {
    setState(() {
      _pingBusy = true;
      _latencies = null;
    });
    final results = <OriginKind, Duration?>{};
    for (final origin in OriginKind.values) {
      results[origin] = await widget.client.ping(origin);
    }
    if (!mounted) return;
    setState(() {
      _latencies = results;
      _pingBusy = false;
    });
  }

  Future<void> _addPin() async {
    final origin = _pinOrigin.text.trim();
    final fingerprint = _pinFingerprint.text.trim();
    if (origin.isEmpty || fingerprint.isEmpty) {
      showToast(context, 'Origin and fingerprint are required',
          kind: ToastKind.warning);
      return;
    }
    setState(() => _pinBusy = true);
    await _pinStore.add(TrustPin(
      origin: origin,
      keyFingerprint: fingerprint,
      label: 'witness-key',
      pinnedAt: DateTime.now().toUtc(),
    ));
    _pinOrigin.clear();
    _pinFingerprint.clear();
    await _reloadPins();
    if (!mounted) return;
    setState(() => _pinBusy = false);
    showToast(context, 'Trust pin added', kind: ToastKind.success);
  }

  String _originName(OriginKind origin) => switch (origin) {
        OriginKind.identity => 'Identity',
        OriginKind.casting => 'Casting',
        OriginKind.witness => 'Witness',
      };

  String _formatLatency(Duration? d) =>
      d == null ? 'unreachable' : '${d.inMilliseconds} ms';

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Origin URLs', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Base URLs for the three independent HimVote origins '
              '(API_CONTRACT.md).',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _identity,
              decoration: const InputDecoration(
                labelText: 'Identity origin',
                prefixIcon: Icon(Icons.badge_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _casting,
              decoration: const InputDecoration(
                labelText: 'Casting origin',
                prefixIcon: Icon(Icons.how_to_vote_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _witness,
              decoration: const InputDecoration(
                labelText: 'Witness origin',
                prefixIcon: Icon(Icons.shield_outlined),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: _save,
                  icon: const Icon(Icons.save_outlined),
                  label: const Text('Save'),
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: _pingBusy ? null : _ping,
                  icon: _pingBusy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.network_check),
                  label: const Text('Ping origins'),
                ),
              ],
            ),
            if (_latencies != null) ...[
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      for (final origin in OriginKind.values)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(_originName(origin),
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium),
                              ),
                              Text(
                                _formatLatency(_latencies![origin]),
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w600,
                                      color: _latencies![origin] == null
                                          ? Theme.of(context)
                                              .colorScheme
                                              .error
                                          : Theme.of(context)
                                              .colorScheme
                                              .primary,
                                    ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 16),
            Text('Trust Pins', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Accepted witness key-pins (config store).',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _pinOrigin,
                            decoration: const InputDecoration(
                              labelText: 'Origin',
                              isDense: true,
                            ),
                            enabled: !_pinBusy,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _pinFingerprint,
                            decoration: const InputDecoration(
                              labelText: 'Key fingerprint',
                              isDense: true,
                            ),
                            enabled: !_pinBusy,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: OutlinedButton.icon(
                        onPressed: _pinBusy ? null : _addPin,
                        icon: const Icon(Icons.add),
                        label: const Text('Add'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (_pins.isEmpty)
              Text(
                'No trust pins yet.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant),
              )
            else
              for (final pin in _pins)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.lock_outline),
                    title: Text(pin.origin),
                    subtitle: Text(
                        '${pin.keyFingerprint} · pinned ${pin.pinnedAt.toLocal().toString().split('.').first}'),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
