import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../api/linux_api_client.dart';
import '../design/status_chip.dart';
import '../design/toast_notification.dart';
import '../models/candidate.dart';
import '../models/election.dart';
import '../models/receipt.dart';

/// Audit Explorer (Phase 2 of the Audit destination).
///
/// Lists the election catalog (identity origin) and, per election, opens a
/// detail view with the published results mini bar chart, a witness-origin
/// tally verification (`POST /v1/engine/verify_tally`) and the evidence
/// archive metadata (`GET /v1/elections/{id}/evidence`). Cryptographic
/// verification is always delegated to the Witness API (API_CONTRACT.md
/// Rule 4) — this screen only renders what the backend confirms.
class AuditExplorerPage extends StatefulWidget {
  const AuditExplorerPage({super.key, required this.client});

  final LinuxApiClient client;

  @override
  State<AuditExplorerPage> createState() => _AuditExplorerPageState();
}

class _AuditExplorerPageState extends State<AuditExplorerPage> {
  late Future<List<Election>> _electionsFuture;

  @override
  void initState() {
    super.initState();
    _electionsFuture = widget.client.elections();
  }

  void _reload() {
    setState(() {
      _electionsFuture = widget.client.elections();
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Audit Explorer'),
        actions: [
          IconButton(
            tooltip: 'Refresh elections',
            icon: const Icon(Icons.refresh),
            onPressed: _reload,
          ),
        ],
      ),
      body: FutureBuilder<List<Election>>(
        future: _electionsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorPane(
              message: 'Could not load elections: ${snapshot.error}',
              onRetry: _reload,
            );
          }
          final elections = snapshot.data ?? const <Election>[];
          if (elections.isEmpty) {
            return Center(
              child: Text('No elections published yet.',
                  style: text.bodyMedium
                      ?.copyWith(color: scheme.onSurfaceVariant)),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: elections.length,
            itemBuilder: (context, index) {
              final election = elections[index];
              return Card(
                margin: const EdgeInsets.symmetric(vertical: 6),
                child: ListTile(
                  key: ValueKey('election-${election.id}'),
                  leading: Icon(Icons.how_to_vote_outlined,
                      color: scheme.primary),
                  title: Text(election.title,
                      style: text.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600)),
                  subtitle: Text(election.id, style: text.bodySmall),
                  trailing: StatusChip.election(election.status),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => _ElectionAuditDetailPage(
                          client: widget.client,
                          election: election,
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _ErrorPane extends StatelessWidget {
  const _ErrorPane({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_off, size: 40, color: scheme.error),
            const SizedBox(height: 12),
            Text(message,
                textAlign: TextAlign.center,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: scheme.onSurfaceVariant)),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Detail view for one election: results table with proportional bars,
/// witness tally verification and the evidence archive summary.
class _ElectionAuditDetailPage extends StatefulWidget {
  const _ElectionAuditDetailPage({
    required this.client,
    required this.election,
  });

  final LinuxApiClient client;
  final Election election;

  @override
  State<_ElectionAuditDetailPage> createState() =>
      _ElectionAuditDetailPageState();
}

class _ElectionAuditDetailPageState extends State<_ElectionAuditDetailPage> {
  PublishedResults? _results;
  Map<String, dynamic> _evidence = const {};
  String? _resultsError;
  String? _evidenceError;

  bool _loading = true;
  bool _verifyingTally = false;
  VerifyTallyResponse? _tally;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _resultsError = null;
      _evidenceError = null;
    });
    // Fire both requests concurrently; the two origins are independent.
    final resultsFuture = widget.client.results(widget.election.id);
    final evidenceFuture = widget.client.evidence(widget.election.id);
    try {
      final results = await resultsFuture;
      if (mounted) setState(() => _results = results);
    } on ApiException catch (e) {
      if (mounted) setState(() => _resultsError = e.detail);
    }
    try {
      final evidence = await evidenceFuture;
      if (mounted) setState(() => _evidence = evidence);
    } on ApiException catch (e) {
      if (mounted) setState(() => _evidenceError = e.detail);
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _verifyTally() async {
    setState(() {
      _verifyingTally = true;
      _tally = null;
    });
    try {
      final tally = await widget.client.verifyTally(widget.election.id);
      if (!mounted) return;
      setState(() {
        _tally = tally;
        _verifyingTally = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _verifyingTally = false);
      showToast(context, 'Tally verification failed: ${e.detail}',
          kind: ToastKind.error);
    }
  }

  String _truncate(String value, [int length = 16]) => value.length <= length
      ? value
      : '${value.substring(0, length)}…';

  String get _evidenceSha {
    final raw = _evidence['sha256']?.toString() ?? '';
    return raw.isEmpty ? '—' : _truncate(raw);
  }

  String get _evidenceMerkleRoot {
    final raw = _evidence['merkle_root']?.toString() ?? '';
    return raw.isEmpty ? '—' : _truncate(raw, 24);
  }

  String get _evidenceBlocks {
    final raw = _evidence['blocks'];
    if (raw is List && raw.isNotEmpty) {
      return '${raw.length} block(s)';
    }
    return raw?.toString() ?? '—';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.election.title),
        actions: [StatusChip.election(widget.election.status)],
        actionsPadding: const EdgeInsets.only(right: 16),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                _ResultsSection(
                  electionId: widget.election.id,
                  results: _results,
                  error: _resultsError,
                ),
                const SizedBox(height: 24),
                _TallyVerifySection(
                  verifying: _verifyingTally,
                  tally: _tally,
                  onVerify: _verifyTally,
                ),
                const SizedBox(height: 24),
                _EvidenceSection(
                  evidence: _evidence,
                  error: _evidenceError,
                  shaLabel: _evidenceSha,
                  merkleRootLabel: _evidenceMerkleRoot,
                  blocksLabel: _evidenceBlocks,
                ),
              ],
            ),
    );
  }
}

/// Ranked results table with a mini bar chart: each row carries a horizontal
/// bar whose width is proportional to the candidate's vote share, built with
/// Row + Container widths.
class _ResultsSection extends StatelessWidget {
  const _ResultsSection({
    required this.electionId,
    required this.results,
    required this.error,
  });

  final String electionId;
  final PublishedResults? results;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Results', style: text.titleMedium),
            const SizedBox(width: 8),
            if (results != null)
              Text(
                '${results!.totalBallots} ballots · '
                '${results!.turnoutPct.toStringAsFixed(1)}% turnout',
                style:
                    text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (error != null)
          Card(
            color: scheme.errorContainer,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: scheme.onErrorContainer),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Results unavailable: $error',
                        style: text.bodyMedium
                            ?.copyWith(color: scheme.onErrorContainer)),
                  ),
                ],
              ),
            ),
          )
        else if (results == null || results!.rows.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'No published results yet.',
              style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
            ),
          )
        else
          _ResultsChart(key: ValueKey('results-$electionId'), results: results!),
      ],
    );
  }
}

class _ResultsChart extends StatelessWidget {
  const _ResultsChart({super.key, required this.results});

  final PublishedResults results;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final rows = results.rows;
    final maxVotes =
        rows.fold<int>(0, (acc, r) => r.votes > acc ? r.votes : acc);
    const reservedWidth = 32.0 + 4.0 + 190.0 + 8.0 + 56.0 + 12.0;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            for (final (i, row) in rows.indexed)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final avail = constraints.maxWidth - reservedWidth;
                    final barWidth = maxVotes <= 0
                        ? 0.0
                        : (row.votes / maxVotes) * (avail < 0 ? 0 : avail);
                    return Row(
                      children: [
                        SizedBox(
                          width: 32,
                          child: Text(
                            '#${i + 1}',
                            style: text.labelMedium
                                ?.copyWith(color: scheme.onSurfaceVariant),
                          ),
                        ),
                        const SizedBox(width: 4),
                        SizedBox(
                          width: 190,
                          child: Text(
                            row.candidateName,
                            overflow: TextOverflow.ellipsis,
                            style: text.bodyMedium
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: 56,
                          child: Text(
                            '${row.votes}',
                            textAlign: TextAlign.right,
                            style: text.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: scheme.primary),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          key: ValueKey('result-bar-${row.candidateId}'),
                          width: barWidth,
                          height: 14,
                          decoration: BoxDecoration(
                            color: scheme.primary,
                            borderRadius: BorderRadius.circular(7),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Witness-origin tally verification: a green VERIFIED check when the two
/// independent origins agree, or a red warning plus a side-by-side count
/// difference when they diverge.
class _TallyVerifySection extends StatelessWidget {
  const _TallyVerifySection({
    required this.verifying,
    required this.tally,
    required this.onVerify,
  });

  final bool verifying;
  final VerifyTallyResponse? tally;
  final VoidCallback onVerify;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Tally verification', style: text.titleMedium),
            const SizedBox(width: 12),
            FilledButton.tonalIcon(
              key: const ValueKey('verify-tally-button'),
              onPressed: verifying ? null : onVerify,
              icon: verifying
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.rule),
              label: Text(verifying ? 'Verifying…' : 'Verify Tally'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (tally != null)
          Card(
            color: tally!.match
                ? Colors.green.withValues(alpha: 0.08)
                : scheme.errorContainer,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        tally!.match
                            ? Icons.check_circle
                            : Icons.warning_amber_rounded,
                        color: tally!.match
                            ? Colors.green.shade600
                            : scheme.onErrorContainer,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        tally!.match ? 'VERIFIED' : 'UNVERIFIED',
                        key: const ValueKey('tally-verdict'),
                        style: text.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: tally!.match
                              ? Colors.green.shade700
                              : scheme.onErrorContainer,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    tally!.match
                        ? 'Identity and Witness tallies agree.'
                        : 'Identity and Witness tallies differ — do not trust '
                            'this result.',
                    style: text.bodySmall?.copyWith(
                      color: tally!.match
                          ? scheme.onSurfaceVariant
                          : scheme.onErrorContainer,
                    ),
                  ),
                  if (!tally!.match) ...[
                    const SizedBox(height: 12),
                    for (final key in _diffKeys(tally!))
                      _TallyDiffRow(
                        key: ValueKey('tally-diff-$key'),
                        candidate: key,
                        identity: tally!.identityTally[key] ?? 0,
                        witness: tally!.witnessTally[key] ?? 0,
                      ),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  /// Keys where the two tally maps disagree (identity vs witness counts).
  List<String> _diffKeys(VerifyTallyResponse tally) {
    final keys = <String>{
      ...tally.identityTally.keys,
      ...tally.witnessTally.keys,
    };
    return keys
        .where((k) =>
            (tally.identityTally[k] ?? 0) != (tally.witnessTally[k] ?? 0))
        .toList()
      ..sort();
  }
}

class _TallyDiffRow extends StatelessWidget {
  const _TallyDiffRow({
    super.key,
    required this.candidate,
    required this.identity,
    required this.witness,
  });

  final String candidate;
  final int identity;
  final int witness;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(candidate,
                overflow: TextOverflow.ellipsis, style: text.bodySmall),
          ),
          const SizedBox(width: 8),
          Text('Identity $identity', style: text.bodySmall),
          const SizedBox(width: 12),
          Text('Witness $witness', style: text.bodySmall),
          const SizedBox(width: 8),
          Icon(Icons.warning_amber_rounded,
              size: 16, color: scheme.onErrorContainer),
        ],
      ),
    );
  }
}

/// Evidence archive metadata: archive URL, truncated SHA-256, Merkle root and
/// block count.
class _EvidenceSection extends StatelessWidget {
  const _EvidenceSection({
    required this.evidence,
    required this.error,
    required this.shaLabel,
    required this.merkleRootLabel,
    required this.blocksLabel,
  });

  final Map<String, dynamic> evidence;
  final String? error;
  final String shaLabel;
  final String merkleRootLabel;
  final String blocksLabel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    Widget row(String label, String value, Key key) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 110,
                child: Text(label,
                    style: text.labelMedium
                        ?.copyWith(color: scheme.onSurfaceVariant)),
              ),
              Expanded(
                child: SelectableText(value, key: key, style: text.bodyMedium),
              ),
            ],
          ),
        );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Evidence', style: text.titleMedium),
        const SizedBox(height: 12),
        if (error != null)
          Card(
            color: scheme.errorContainer,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text('Evidence unavailable: $error',
                  style: text.bodyMedium
                      ?.copyWith(color: scheme.onErrorContainer)),
            ),
          )
        else
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  row('Archive', evidence['archive_url']?.toString() ?? '—',
                      const ValueKey('evidence-archive-url')),
                  row('SHA-256', shaLabel, const ValueKey('evidence-sha256')),
                  row('Merkle root', merkleRootLabel,
                      const ValueKey('evidence-merkle-root')),
                  row('Blocks', blocksLabel, const ValueKey('evidence-blocks')),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
