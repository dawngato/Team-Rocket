import 'package:flutter/material.dart';

import '../models/election.dart';
import '../models/receipt.dart';

/// Pill-shaped status badge used for both election lifecycle statuses and
/// receipt pipeline stages (MIGRATION_SPEC.md shared components list).
class StatusChip extends StatelessWidget {
  const StatusChip.election(ElectionStatus status, {super.key})
      : _status = status,
        _stage = null;

  const StatusChip.receipt(ReceiptStage stage, {super.key})
      : _stage = stage,
        _status = null;

  final ElectionStatus? _status;
  final ReceiptStage? _stage;

  (String, Color) get _look {
    final (String label, MaterialColor color) = switch ((_status, _stage)) {
      (final ElectionStatus s, _) => switch (s) {
          ElectionStatus.open => (s.name, Colors.green),
          ElectionStatus.counting => (s.name, Colors.amber),
          ElectionStatus.scheduled => (s.name, Colors.lightBlue),
          ElectionStatus.paused => (s.name, Colors.orange),
          ElectionStatus.closed => (s.name, Colors.blueGrey),
          ElectionStatus.certified => (s.name, Colors.teal),
          ElectionStatus.draft => (s.name, Colors.blueGrey),
          ElectionStatus.archived => (s.name, Colors.brown),
          ElectionStatus.unknown => ('unknown', Colors.grey),
        },
      (_, final ReceiptStage s) => switch (s) {
          ReceiptStage.submitted => (s.wire, Colors.blueGrey),
          ReceiptStage.accepted => (s.wire, Colors.lightBlue),
          ReceiptStage.witnessed => (s.wire, Colors.amber),
          ReceiptStage.anchored => (s.wire, Colors.green),
          ReceiptStage.unknown => ('UNKNOWN', Colors.grey),
        },
      // Unreachable by construction (one of the two is always set).
      (null, null) => ('unknown', Colors.grey),
    };
    return (label, color);
  }

  @override
  Widget build(BuildContext context) {
    final (label, color) = _look;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.7), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 8, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .labelMedium
                ?.copyWith(color: color, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
