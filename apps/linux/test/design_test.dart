import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:himvote/design/status_chip.dart';
import 'package:himvote/design/toast_notification.dart';
import 'package:himvote/models/election.dart';
import 'package:himvote/models/receipt.dart';

void main() {
  group('StatusChip', () {
    testWidgets('election status renders its label', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: StatusChip.election(ElectionStatus.open)),
      ));
      expect(find.text('open'), findsOneWidget);
    });

    testWidgets('receipt stage renders its wire label', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: StatusChip.receipt(ReceiptStage.anchored)),
      ));
      expect(find.text('ANCHORED'), findsOneWidget);
    });

    testWidgets('unknown status degrades to a grey unknown chip',
        (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: StatusChip.election(ElectionStatus.unknown)),
      ));
      expect(find.text('unknown'), findsOneWidget);
    });
  });

  group('ToastNotification', () {
    testWidgets('showToast surfaces a message via ScaffoldMessenger',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => Center(
              child: TextButton(
                onPressed: () => showToast(context, 'Receipt saved',
                    kind: ToastKind.success),
                child: const Text('go'),
              ),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('go'));
      await tester.pump(); // start animation
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('Receipt saved'), findsOneWidget);
      expect(find.byIcon(Icons.check_circle_outline), findsOneWidget);

      // auto-dismisses after the duration + exit animation
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();
      expect(find.text('Receipt saved'), findsNothing);
    });
  });
}
