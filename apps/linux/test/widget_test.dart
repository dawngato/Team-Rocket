import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:himvote/design/himvote_theme.dart';
import 'package:himvote/main.dart';
import 'package:himvote/models/app_settings.dart';
import 'package:himvote/screens/nav_shell.dart';

void _setView(WidgetTester tester) {
  // Desktop-sized surface: the 8-destination rail needs room (default test
  // viewport is 800x600 phone-ish).
  tester.view.physicalSize = const Size(1280, 900);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
}

Future<void> _pumpApp(WidgetTester tester) async {
  _setView(tester);
  await tester.pumpWidget(
    HimVoteApp(
      initialSettings: AppSettings.defaults(),
      settingsStore: null, // no disk I/O in widget tests
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('shell renders all 8 destinations, starting on Elections',
      (tester) async {
    await _pumpApp(tester);
    expect(find.byType(NavigationRail), findsOneWidget);
    // Every destination label is rendered in the rail.
    for (final label in ['Elections', 'Receipts', 'Audit', 'Explain', 'Trust',
        'Session', 'Settings', 'Admin']) {
      expect(find.text(label), findsWidgets);
    }
    // Elections placeholder body is visible by default.
    expect(find.textContaining('Browse elections'), findsOneWidget);
  });

  testWidgets('clicking a rail destination switches the page', (tester) async {
    await _pumpApp(tester);
    await tester.tap(find.text('Admin').last);
    await tester.pumpAndSettle();
    expect(find.textContaining('audit trail page'), findsOneWidget);
  });

  testWidgets('Ctrl+5 jumps to Trust, Ctrl+3 to Audit', (tester) async {
    await _pumpApp(tester);
    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendKeyEvent(LogicalKeyboardKey.digit5);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await tester.pumpAndSettle();
    expect(find.textContaining('trust model page'), findsOneWidget);

    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendKeyEvent(LogicalKeyboardKey.digit3);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await tester.pumpAndSettle();
    expect(find.textContaining('Merkle visualizer'), findsOneWidget);
  });

  testWidgets('default theme is classic light (white surface)', (tester) async {
    await _pumpApp(tester);
    final context = tester.element(find.byType(NavShell));
    final theme = Theme.of(context);
    expect(theme.brightness, Brightness.light);
    expect(theme.colorScheme.surface, HimVoteTheme.lightSurface);
    expect(theme.scaffoldBackgroundColor, HimVoteTheme.lightSurface);
  });

  testWidgets('theme toggle switches to dark and back', (tester) async {
    await _pumpApp(tester);
    expect(Theme.of(tester.element(find.byType(NavShell))).brightness,
        Brightness.light);

    await tester.tap(find.byTooltip('Dark theme (Ctrl+T)'));
    await tester.pumpAndSettle();
    expect(Theme.of(tester.element(find.byType(NavShell))).brightness,
        Brightness.dark);

    await tester.tap(find.byTooltip('Light theme (Ctrl+T)'));
    await tester.pumpAndSettle();
    expect(Theme.of(tester.element(find.byType(NavShell))).brightness,
        Brightness.light);
  });

  testWidgets('Ctrl+T toggles dark mode via keyboard', (tester) async {
    await _pumpApp(tester);
    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendKeyEvent(LogicalKeyboardKey.keyT);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await tester.pumpAndSettle();
    expect(Theme.of(tester.element(find.byType(NavShell))).brightness,
        Brightness.dark);
  });

  testWidgets('dark preference persists from saved settings on boot',
      (tester) async {
    _setView(tester);
    await tester.pumpWidget(
      HimVoteApp(
        initialSettings: AppSettings.defaults()
            .copyWith(themePreference: ThemePreference.dark),
        settingsStore: null,
      ),
    );
    await tester.pumpAndSettle();
    expect(Theme.of(tester.element(find.byType(NavShell))).brightness,
        Brightness.dark);
  });

  testWidgets('contrast toggle switches to the WCAG AAA scheme', (tester) async {
    await _pumpApp(tester);

    // Normal dark scheme: scaffold is NOT pure black.
    final beforeContext = tester.element(find.byType(NavShell));
    expect(Theme.of(beforeContext).colorScheme.surface,
        isNot(HimVoteTheme.hcBackground));

    await tester.tap(find.byTooltip('High contrast (Ctrl+H)'));
    await tester.pumpAndSettle();

    final afterContext = tester.element(find.byType(NavShell));
    expect(Theme.of(afterContext).colorScheme.surface, HimVoteTheme.hcBackground);
    expect(Theme.of(afterContext).colorScheme.primary, HimVoteTheme.hcPrimary);
  });

  testWidgets('Ctrl+H toggles high contrast without the button', (tester) async {
    await _pumpApp(tester);
    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendKeyEvent(LogicalKeyboardKey.keyH);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await tester.pumpAndSettle();
    final context = tester.element(find.byType(NavShell));
    expect(Theme.of(context).colorScheme.surface, HimVoteTheme.hcBackground);
  });

  testWidgets('high contrast persists from saved settings on boot',
      (tester) async {
    _setView(tester);
    await tester.pumpWidget(
      HimVoteApp(
        initialSettings: AppSettings.defaults().copyWith(highContrast: true),
        settingsStore: null,
      ),
    );
    await tester.pumpAndSettle();
    final context = tester.element(find.byType(NavShell));
    expect(Theme.of(context).colorScheme.surface, HimVoteTheme.hcBackground);
  });
}
