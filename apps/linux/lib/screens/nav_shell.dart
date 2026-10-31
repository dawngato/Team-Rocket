import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/linux_api_client.dart';
import '../design/himvote_theme.dart';
import '../models/app_settings.dart';
import '../storage/app_settings_store.dart';
import '../storage/receipt_store.dart';
import '../storage/storage_backend.dart';
import 'admin_audit_page.dart';
import 'audit_explorer_page.dart';
import 'elections_page.dart';
import 'explain_page.dart';
import 'placeholders.dart';
import 'receipt_verify_page.dart';
import 'session_page.dart';
import 'settings_page.dart';
import 'trust_model_page.dart';

/// NavigationShell: Material 3 NavigationRail with the 8 destinations from
/// MIGRATION_SPEC.md (Elections, Receipts, Audit, Explain, Trust, Session,
/// Settings, Admin). Placeholder pages stand in until Phase 2 branches land.
///
/// Keyboard parity with the tkinter app: Ctrl+1..8 jumps to a destination,
/// Ctrl+H toggles High-Contrast (WCAG 2.1 AAA), Ctrl+T toggles light/dark.
class NavShell extends StatefulWidget {
  const NavShell({
    super.key,
    required this.highContrast,
    required this.onContrastChanged,
    required this.themePreference,
    required this.onThemeChanged,
    this.client,
    this.walletStore,
    this.settings,
    this.settingsStore,
  });

  final bool highContrast;
  final ValueChanged<bool> onContrastChanged;
  final ThemePreference themePreference;
  final ValueChanged<ThemePreference> onThemeChanged;

  /// When null (e.g. widget tests), the shell shows placeholder pages.
  /// When provided, all 8 destinations render their real Phase 2 screen.
  final LinuxApiClient? client;
  final ReceiptWalletStore? walletStore;
  final AppSettings? settings;
  final AppSettingsStore? settingsStore;

  @override
  State<NavShell> createState() => _NavShellState();
}

class _Destination {
  const _Destination(this.title, this.icon, this.branch, this.blurb);
  final String title;
  final IconData icon;
  final String branch;
  final String blurb;
}

const _destinations = [
  _Destination('Elections', Icons.how_to_vote_outlined, 'feat/linux-elections',
      'Browse elections, candidates and results. Candidate detail modals arrive in Phase 2.'),
  _Destination('Receipts', Icons.receipt_long_outlined, 'feat/linux-receipt-audit',
      'Four-stage receipt verification and the receipt wallet arrive in Phase 2.'),
  _Destination('Audit', Icons.manage_search_outlined, 'feat/linux-receipt-audit',
      'Offline audit explorer with Merkle visualizer arrives in Phase 2.'),
  _Destination('Explain', Icons.account_tree_outlined, 'feat/linux-diagnostics',
      'Tier 1-4 verification architecture explainer arrives in Phase 2.'),
  _Destination('Trust', Icons.shield_outlined, 'feat/linux-diagnostics',
      'Security limits and trust model page arrives in Phase 2.'),
  _Destination('Session', Icons.badge_outlined, 'feat/linux-identity-settings',
      'SSO login, MFA and demo profiles arrive in Phase 2.'),
  _Destination('Settings', Icons.settings_outlined, 'feat/linux-identity-settings',
      'Three origins, latency ping and Trust Pin store arrive in Phase 2.'),
  _Destination('Admin', Icons.admin_panel_settings_outlined, 'feat/linux-identity-settings',
      'Append-only audit trail page arrives in Phase 2.'),
];

class _NavShellState extends State<NavShell> {
  int _index = 0;

  void _select(int index) => setState(() => _index = index);

  void _toggleContrast() =>
      widget.onContrastChanged(!widget.highContrast);

  void _toggleTheme() => widget.onThemeChanged(
        widget.themePreference == ThemePreference.dark
            ? ThemePreference.light
            : ThemePreference.dark,
      );

  Map<ShortcutActivator, VoidCallback> get _bindings => {
        const SingleActivator(LogicalKeyboardKey.digit1, control: true): () => _select(0),
        const SingleActivator(LogicalKeyboardKey.digit2, control: true): () => _select(1),
        const SingleActivator(LogicalKeyboardKey.digit3, control: true): () => _select(2),
        const SingleActivator(LogicalKeyboardKey.digit4, control: true): () => _select(3),
        const SingleActivator(LogicalKeyboardKey.digit5, control: true): () => _select(4),
        const SingleActivator(LogicalKeyboardKey.digit6, control: true): () => _select(5),
        const SingleActivator(LogicalKeyboardKey.digit7, control: true): () => _select(6),
        const SingleActivator(LogicalKeyboardKey.digit8, control: true): () => _select(7),
        const SingleActivator(LogicalKeyboardKey.keyH, control: true): _toggleContrast,
        const SingleActivator(LogicalKeyboardKey.keyT, control: true): _toggleTheme,
      };

  /// The eight destination bodies. Real Phase 2 screens when a client is
  /// injected; placeholders otherwise (keeps widget tests hermetic).
  List<Widget> _buildPages() {
    final client = widget.client;
    if (client == null) {
      return [
        for (final d in _destinations)
          PagePlaceholder(
            title: d.title,
            icon: d.icon,
            branch: d.branch,
            blurb: d.blurb,
          ),
      ];
    }
    return [
      ElectionsPage(client: client),
      ReceiptVerifyPage(
        client: client,
        walletStore: widget.walletStore ??
            ReceiptWalletStore(PlatformStores.create().data),
      ),
      AuditExplorerPage(client: client),
      ExplainPage(client: client),
      const TrustModelPage(),
      SessionPage(client: client),
      SettingsPage(
        client: client,
        settings: widget.settings ?? AppSettings.defaults(),
        settingsStore: widget.settingsStore ??
            AppSettingsStore(PlatformStores.create().config),
        onSettingsSaved: client.reconfigure,
      ),
      AdminAuditPage(client: client),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final destination = _destinations[_index];
    return CallbackShortcuts(
      bindings: _bindings,
      child: Focus(
        autofocus: true,
        child: Scaffold(
          appBar: AppBar(
            title: Text(destination.title),
            actions: [
              IconButton(
                tooltip: widget.themePreference == ThemePreference.dark
                    ? 'Light theme (Ctrl+T)'
                    : 'Dark theme (Ctrl+T)',
                icon: Icon(widget.themePreference == ThemePreference.dark
                    ? Icons.light_mode_outlined
                    : Icons.dark_mode_outlined),
                onPressed: _toggleTheme,
              ),
              IconButton(
                tooltip: 'High contrast (Ctrl+H)',
                icon: Icon(widget.highContrast ? Icons.contrast : Icons.contrast_outlined),
                onPressed: _toggleContrast,
              ),
            ],
          ),
          body: Row(
            children: [
              NavigationRail(
                selectedIndex: _index,
                onDestinationSelected: _select,
                labelType: NavigationRailLabelType.all,
                leading: Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 8),
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: HimVoteTheme.seed,
                    child: const Icon(Icons.how_to_vote, color: Colors.white, size: 20),
                  ),
                ),
                destinations: [
                  for (final d in _destinations)
                    NavigationRailDestination(
                      icon: Icon(d.icon),
                      selectedIcon: Icon(d.icon),
                      label: Text(d.title),
                    ),
                ],
              ),
              const VerticalDivider(width: 1),
              Expanded(
                child: IndexedStack(
                  index: _index,
                  children: _buildPages(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
