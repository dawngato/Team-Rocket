import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../api/linux_api_client.dart';
import '../design/status_chip.dart';
import '../models/election.dart';
import 'candidate_detail_modal.dart';

/// Elections landing page — Phase 2 of the Linux Flutter port.
///
/// Fetches the election catalogue from the Identity origin via
/// [LinuxApiClient.elections], lets the user search (title) and filter by
/// lifecycle status, and opens a [CandidateDetailModal] on tap.
///
/// Wire shapes match apps/linux/dev/mock_v1_server.py (API_CONTRACT.md):
/// an election entry carries `id, title, status, starts_at, ends_at,
/// description, candidate_count`.
class ElectionsPage extends StatefulWidget {
  const ElectionsPage({super.key, required this.client});

  final LinuxApiClient client;

  @override
  State<ElectionsPage> createState() => _ElectionsPageState();
}

class _ElectionsPageState extends State<ElectionsPage> {
  /// Status chips: All (null) plus the statuses surfaced by the mock seeds.
  static const List<ElectionStatus?> _filters = [
    null,
    ElectionStatus.open,
    ElectionStatus.scheduled,
    ElectionStatus.counting,
  ];

  late Future<List<Election>> _future;
  final TextEditingController _search = TextEditingController();
  ElectionStatus? _status;

  @override
  void initState() {
    super.initState();
    _future = widget.client.elections();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _reload() {
    setState(() => _future = widget.client.elections());
  }

  List<Election> _filtered(List<Election> all) {
    final q = _search.text.trim().toLowerCase();
    return all.where((e) {
      final matchesTitle = q.isEmpty || e.title.toLowerCase().contains(q);
      final matchesStatus = _status == null || e.status == _status;
      return matchesTitle && matchesStatus;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: TextField(
            controller: _search,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'Search elections by title…',
              prefixIcon: Icon(Icons.search, color: scheme.onSurfaceVariant),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              suffixIcon: _search.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => setState(_search.clear),
                    ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in _filters)
                ChoiceChip(
                  label: Text(s == null ? 'All' : s.name),
                  selected: _status == s,
                  onSelected: (_) => setState(() => _status = s),
                ),
            ],
          ),
        ),
        Expanded(
          child: FutureBuilder<List<Election>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _ErrorState(error: snapshot.error!, onRetry: _reload);
              }
              final elections = _filtered(snapshot.data ?? const []);
              if (elections.isEmpty) {
                return _EmptyState(hasQuery: _search.text.isNotEmpty);
              }
              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: elections.length,
                itemBuilder: (context, i) {
                  final election = elections[i];
                  return _ElectionCard(
                    election: election,
                    onTap: () => showCandidateDetailModal(
                      context,
                      client: widget.client,
                      election: election,
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Format a [DateTime] as `yyyy-MM-dd HH:mm UTC` (mock seeds ship Z endings).
String formatUtc(DateTime? dt) {
  if (dt == null) return '—';
  final u = dt.toUtc();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${u.year}-${two(u.month)}-${two(u.day)} '
      '${two(u.hour)}:${two(u.minute)} UTC';
}

class _ElectionCard extends StatelessWidget {
  const _ElectionCard({required this.election, required this.onTap});

  final Election election;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final range =
        '${formatUtc(election.startsAt)} – ${formatUtc(election.endsAt)}';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(election.title, style: text.titleMedium),
                  ),
                  const SizedBox(width: 12),
                  StatusChip.election(election.status),
                ],
              ),
              const SizedBox(height: 8),
              if (election.description.isNotEmpty)
                Text(
                  election.description,
                  style: text.bodyMedium
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.people_outline,
                      size: 16, color: scheme.onSurfaceVariant),
                  const SizedBox(width: 6),
                  Text(
                    '${election.candidateCount} candidates',
                    style: text.bodySmall
                        ?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.schedule, size: 16, color: scheme.onSurfaceVariant),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      range,
                      style: text.bodySmall
                          ?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.hasQuery});

  final bool hasQuery;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.how_to_vote_outlined, size: 48, color: scheme.outline),
          const SizedBox(height: 12),
          Text(
            hasQuery ? 'No elections match your search.' : 'No elections yet.',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error, required this.onRetry});

  final Object? error;
  final VoidCallback onRetry;

  String get _message {
    if (error is ApiException) {
      final e = error as ApiException;
      return e.detail.isEmpty ? 'Something went wrong.' : e.detail;
    }
    return error?.toString() ?? 'Something went wrong.';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off, size: 48, color: scheme.error),
            const SizedBox(height: 12),
            Text(_message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
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