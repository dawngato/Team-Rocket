// Integration smoke: NavShell with a real (mocked-HTTP) LinuxApiClient renders
// the actual Phase 2 screens instead of placeholders, and rail navigation
// lands on the right page.
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:himvote/api/linux_api_client.dart';
import 'package:himvote/main.dart';
import 'package:himvote/models/app_settings.dart';

http.Response _json(Object body, [int status = 200]) => http.Response(
    jsonEncode(body), status,
    headers: {'content-type': 'application/json'});

LinuxApiClient _client() => LinuxApiClient(
      settings: const AppSettings(
        identityOrigin: 'http://id.test',
        castingOrigin: 'http://cast.test',
        witnessOrigin: 'http://wit.test',
      ),
      httpClient: MockClient((req) async {
        switch (req.url.path) {
          case '/v1/elections':
            return _json([
              {'id': 'elec-1', 'title': 'Student Council President 2026', 'status': 'open', 'candidate_count': 4},
              {'id': 'elec-2', 'title': 'Drama Society Committee', 'status': 'counting', 'candidate_count': 3},
            ]);
          case '/v1/auth/me':
            return _json({'detail': 'Not authenticated'}, 401);
          case '/v1/health':
            return _json({'status': 'ok'});
        }
        return _json({'detail': 'Not found'}, 404);
      }),
    );

void main() {
  testWidgets('shell with client renders Elections screen and navigates to Receipts',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(HimVoteApp(
      initialSettings: AppSettings.defaults(),
      settingsStore: null,
      client: _client(),
      walletStore: null,
    ));
    await tester.pumpAndSettle();

    // Real Elections screen is live: elections from the (mock) API visible.
    expect(find.text('Student Council President 2026'), findsWidgets);
    expect(find.text('open'), findsWidgets); // StatusChip label

    // Rail navigation lands on the ReceiptVerifyPage (search field present).
    await tester.tap(find.text('Receipts').last);
    await tester.pumpAndSettle();
    expect(find.byType(TextField), findsWidgets);

    // And Session shows the login form (not authed).
    await tester.tap(find.text('Session').last);
    await tester.pumpAndSettle();
    expect(find.text('Login'), findsWidgets);
  });
}
