import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/api_exception.dart';
import '../api/linux_api_client.dart';
import '../design/toast_notification.dart';

/// Educational "how verification works" explainer (MIGRATION_SPEC.md #4).
///
/// Renders the four-tier verification architecture as numbered cards joined
/// by a dashed vertical timeline:
///
///  * Tier 1 — Gateway submission: every ballot enters through the gateway.
///  * Tier 2 — Casting origin: blind-signature ballot, no plaintext link
///    back to the voter.
///  * Tier 3 — Witness origin: independent RFC 9162 Merkle log, every
///    receipt gets an inclusion proof.
///  * Tier 4 — Chain anchoring: root hashes anchored on-chain, tamper-evident.
///
/// When a [LinuxApiClient] is supplied, a live "Fetch witness key" action
/// calls `GET /witness/public_key` and shows the first 16 hex characters with
/// a copy-to-clipboard action (used to pin the Witness signing key).
class ExplainPage extends StatefulWidget {
  const ExplainPage({super.key, this.client});

  /// Optional client for the live Witness key fetch; when null the page is
  /// purely informational and no network calls happen.
  final LinuxApiClient? client;

  @override
  State<ExplainPage> createState() => _ExplainPageState();
}

class _Tier {
  const _Tier(this.title, this.subtitle, this.bullets);

  final String title;
  final String subtitle;
  final List<String> bullets;
}

const List<_Tier> _tiers = [
  _Tier(
    'Gateway Submission',
    'Tier 1 — every ballot enters through the gateway',
    [
      'Your blinded credential is handed to the Casting origin; the gateway never sees your plaintext selections.',
      'Submission is recorded before any tallying begins, so every ballot is accounted for.',
    ],
  ),
  _Tier(
    'Casting Origin',
    'Tier 2 — blind-signature ballot, no plaintext link to you',
    [
      'An RSA blind signature (RFC 9474) proves the ballot was issued to a real voter without revealing which one.',
      'Identity and selections never exist on the same server, so nobody can connect your vote back to you.',
    ],
  ),
  _Tier(
    'Witness Origin',
    'Tier 3 — independent RFC 9162 Merkle log',
    [
      'Every accepted ballot is canonicalized and inserted as an ordered leaf in an append-only Merkle tree.',
      'Every receipt gets an inclusion proof: a verifiable sibling path from its leaf up to the published root.',
    ],
  ),
  _Tier(
    'Chain Anchoring',
    'Tier 4 — root hashes anchored; tamper-evident',
    [
      'Witnessed tree-head checkpoints are anchored onto the public chain with a timestamp.',
      'Altering any ballot corrupts the tree root — and the anchored checkpoint makes the tamper impossible to hide.',
    ],
  ),
];

class _ExplainPageState extends State<ExplainPage> {
  bool _loading = false;
  String? _witnessKey;
  String? _error;

  Future<void> _fetchWitnessKey() async {
    final client = widget.client;
    if (client == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final key = await client.witnessPublicKey();
      if (!mounted) return;
      if (key.trim().isEmpty) {
        setState(() {
          _loading = false;
          _error = 'The witness origin returned an empty key.';
        });
        return;
      }
      setState(() {
        _witnessKey = key;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.detail.isEmpty ? 'Could not reach the witness origin.' : e.detail;
      });
      showToast(context, 'Could not fetch the witness key.', kind: ToastKind.error);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Unexpected error while fetching the witness key.';
      });
    }
  }

  void _copyKey() {
    final key = _witnessKey;
    if (key == null || key.isEmpty) return;
    Clipboard.setData(ClipboardData(text: key));
    showToast(context, 'Witness signing key copied — pin it in Settings.',
        kind: ToastKind.success);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('How Verification Works', style: text.headlineSmall),
          const SizedBox(height: 6),
          Text(
            'HimVote replaces administrative trust with four independent, '
            'mathematically verifiable layers. Every ballot is '
            'cast-as-intended, recorded-as-cast and tallied-as-recorded.',
            style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 20),
          for (var i = 0; i < _tiers.length; i++) _tierRow(context, i),
          const SizedBox(height: 12),
          _witnessSection(context),
        ],
      ),
    );
  }

  Widget _tierRow(BuildContext context, int index) {
    final tier = _tiers[index];
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final accents = [
      scheme.primary,
      scheme.secondary,
      scheme.tertiary,
      scheme.error,
    ];
    final accent = accents[index % accents.length];
    final isLast = index == _tiers.length - 1;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                  border: Border.all(color: accent, width: 1.5),
                ),
                alignment: Alignment.center,
                child: Text(
                  '${index + 1}',
                  style: text.titleSmall
                      ?.copyWith(color: accent, fontWeight: FontWeight.w700),
                ),
              ),
              if (!isLast) Expanded(child: _DashConnector(color: scheme.outlineVariant)),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Card(
              key: ValueKey('tier-card-${index + 1}'),
              margin: const EdgeInsets.only(bottom: 16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TIER ${index + 1} — ${tier.title}',
                      style: text.titleMedium
                          ?.copyWith(color: accent, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tier.subtitle,
                      style: text.labelLarge?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 10),
                    for (final bullet in tier.bullets)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.check_circle_outline, size: 16, color: accent),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                bullet,
                                style: text.bodyMedium
                                    ?.copyWith(color: scheme.onSurfaceVariant),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _witnessSection(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final client = widget.client;
    if (client == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(Icons.key_outlined, color: scheme.onSurfaceVariant),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Connect the Witness origin in Settings to fetch and pin its '
                  'signing key.',
                  style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                ),
              ),
            ],
          ),
        ),
      );
    }
    return Card(
      key: const ValueKey('witness-key-card'),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.key_outlined, color: scheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Witness Signing Key',
                  style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'The Witness co-signs Merkle checkpoints with its Ed25519 signing '
              'key. Fetch the key, verify it out-of-band, then pin it in Settings '
              '— a swapped witness server can then never present forged proofs to you.',
              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 14),
            if (_witnessKey != null && _witnessKey!.isNotEmpty)
              _keyRow(context)
            else if (_loading)
              const Row(
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 10),
                  Text('Fetching…'),
                ],
              )
            else
              OutlinedButton.icon(
                key: const ValueKey('fetch-witness-key'),
                onPressed: _fetchWitnessKey,
                icon: const Icon(Icons.download_outlined, size: 18),
                label: const Text('Fetch witness key'),
              ),
            if (_error != null)
              Padding(
                key: const ValueKey('witness-key-error'),
                padding: const EdgeInsets.only(top: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.error_outline, size: 16, color: scheme.error),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _error!,
                        style: text.bodySmall?.copyWith(color: scheme.error),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _keyRow(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final key = _witnessKey!;
    final display = key.length <= 16 ? key : '${key.substring(0, 16)}…';
    return Container(
      key: const ValueKey('witness-key-row'),
      padding: const EdgeInsets.only(left: 12, right: 4),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              display,
              key: const ValueKey('witness-key-text'),
              style: text.bodyMedium
                  ?.copyWith(fontFamily: 'monospace', color: scheme.onSurface),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            key: const ValueKey('copy-witness-key'),
            tooltip: 'Copy full key',
            icon: const Icon(Icons.copy, size: 18),
            onPressed: _copyKey,
          ),
        ],
      ),
    );
  }
}

/// A short vertical dashed segment that joins two tier badges on the timeline.
class _DashConnector extends StatelessWidget {
  const _DashConnector({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(2, double.infinity),
      painter: _DashPainter(color: color),
    );
  }
}

class _DashPainter extends CustomPainter {
  const _DashPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = size.width
      ..strokeCap = StrokeCap.round;
    const dash = 4.0;
    const gap = 4.0;
    final step = dash + gap;
    var y = dash / 2;
    while (y < size.height) {
      final end = math.min(y + dash, size.height);
      canvas.drawLine(
        Offset(size.width / 2, y),
        Offset(size.width / 2, end),
        paint,
      );
      y += step;
    }
  }

  @override
  bool shouldRepaint(covariant _DashPainter oldDelegate) =>
      oldDelegate.color != color;
}
