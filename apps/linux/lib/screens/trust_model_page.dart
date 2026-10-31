import 'package:flutter/material.dart';

import '../design/status_chip.dart';
import '../models/receipt.dart';

/// "What you must trust" explainer (MIGRATION_SPEC.md #5).
///
/// Port of the tkinter _show_security_limits view, in strict compliance with
/// Rule 0.1(7): no unqualified claims such as "unhackable" or "100% secure".
/// The page states the exact guarantees verification proves, the few trust
/// boundaries that remain with institutions, and maps each guarantee to the
/// stage of the receipt pipeline (SUBMITTED -> ACCEPTED -> WITNESSED ->
/// ANCHORED) where it is established.
class TrustModelPage extends StatelessWidget {
  const TrustModelPage({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('What You Must Trust', style: text.headlineSmall),
          const SizedBox(height: 6),
          Text(
            'HimVote does not claim to be unhackable. These are the exact '
            'properties its proofs establish — and the few boundaries where '
            'institutional trust still applies.',
            style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 24),
          _sectionHeader(
            context,
            key: const ValueKey('guarantees-section'),
            icon: Icons.verified_user_outlined,
            title: 'The Guarantees',
            tint: scheme.primary,
          ),
          const SizedBox(height: 12),
          for (final g in _guarantees)
            _infoCard(context,
                icon: g.icon, title: g.title, body: g.body, tint: scheme.primary),
          const SizedBox(height: 24),
          _sectionHeader(
            context,
            key: const ValueKey('boundaries-section'),
            icon: Icons.warning_amber_outlined,
            title: 'Trust Boundaries',
            tint: scheme.error,
          ),
          const SizedBox(height: 12),
          for (final b in _boundaries)
            _infoCard(context,
                icon: b.icon, title: b.title, body: b.body, tint: scheme.tertiary),
          const SizedBox(height: 24),
          _sectionHeader(
            context,
            key: const ValueKey('pipeline-section'),
            icon: Icons.account_tree_outlined,
            title: 'Where Each Guarantee Is Established',
            tint: scheme.secondary,
          ),
          const SizedBox(height: 12),
          _pipeline(context),
        ],
      ),
    );
  }

  Widget _sectionHeader(
    BuildContext context, {
    required Key key,
    required IconData icon,
    required String title,
    required Color tint,
  }) {
    final text = Theme.of(context).textTheme;
    return Row(
      key: key,
      children: [
        Icon(icon, color: tint),
        const SizedBox(width: 8),
        Text(
          title,
          style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
      ],
    );
  }

  Widget _infoCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String body,
    required Color tint,
  }) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: tint, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body,
                    style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _pipeline(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    const stages = <(ReceiptStage, String)>[
      (ReceiptStage.submitted,
          'The gateway accepts your ballot and hands it to the Casting origin.'),
      (ReceiptStage.accepted,
          'The blind signature checks out — your choices remain unlinkable to you.'),
      (ReceiptStage.witnessed,
          'The ballot enters the Merkle log and your inclusion proof is issued.'),
      (ReceiptStage.anchored,
          'The tree root is anchored on-chain — tampering is now mathematically evident.'),
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (var i = 0; i < stages.length; i++) ...[
                if (i > 0)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Icon(Icons.arrow_forward, color: scheme.outline),
                  ),
                SizedBox(
                  width: 170,
                  child: Column(
                    key: ValueKey('pipeline-stage-${stages[i].$1.name}'),
                    children: [
                      StatusChip.receipt(stages[i].$1),
                      const SizedBox(height: 8),
                      Text(
                        stages[i].$2,
                        textAlign: TextAlign.center,
                        style: text.bodySmall
                            ?.copyWith(color: scheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Item {
  const _Item(this.icon, this.title, this.body);

  final IconData icon;
  final String title;
  final String body;
}

const List<_Item> _guarantees = [
  _Item(
    Icons.visibility_off_outlined,
    'Nobody can see your ballot',
    'Your ballot travels as a blinded, blind-signed credential: no server ever '
        'holds your identity together with your plaintext selections. The '
        'Casting origin verifies the signature without learning who voted.',
  ),
  _Item(
    Icons.gavel_outlined,
    'Officials cannot alter published results without breaking proofs',
    'Published results must match the anchored Merkle log. Changing any ballot '
        'corrupts the tree root and invalidates witness checkpoints — the '
        'tamper is mathematically evident, not merely detectable by auditors.',
  ),
  _Item(
    Icons.fact_check_outlined,
    'Receipts are independently verifiable',
    'Your inclusion proof checks against the public tree root on any machine — '
        'no server, no login, and no trust in the operator is required.',
  ),
];

const List<_Item> _boundaries = [
  _Item(
    Icons.key_outlined,
    'You trust the Witness to log correctly — so pin its key',
    'The Witness is only as trustworthy as its log. Fetch its Ed25519 signing '
        'key, verify it out-of-band, and pin it (Settings → Trust Pin) so a '
        'swapped or hostile witness is detected on first contact.',
  ),
  _Item(
    Icons.badge_outlined,
    'You trust the registrar for voter eligibility',
    'The Identity origin decides who is on the roll. Proofs certify that '
        'ballots match issued credentials — they cannot certify whether the '
        'student was legally eligible.',
  ),
  _Item(
    Icons.calculate_outlined,
    'Auditors can recompute everything offline',
    'Exported archives let auditors re-derive tallies and Merkle roots without '
        'the live service — the strongest check of all, because it needs no '
        'running system to believe.',
  ),
];
