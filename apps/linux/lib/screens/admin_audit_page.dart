import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../api/linux_api_client.dart';
import '../models/audit_event.dart';

/// Admin governance page: append-only audit trail + pending approvals
/// (Identity origin, `/v1/admin/*`). Non-admin profiles see a gate notice.
class AdminAuditPage extends StatefulWidget {
  const AdminAuditPage({super.key, required this.client});

  final LinuxApiClient client;

  @override
  State<AdminAuditPage> createState() => _AdminAuditPageState();
}

class _AdminAuditPageState extends State<AdminAuditPage> {
  bool _loading = true;
  bool _isAdmin = false;
  bool _unauthorized = false;
  List<AuditEvent> _events = const [];
  List<AdminApproval> _approvals = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final profile = await widget.client.me();
      if (!mounted) return;
      if (!profile.role.isAdmin) {
        setState(() {
          _isAdmin = false;
          _loading = false;
        });
        return;
      }
      _isAdmin = true;
      final events = await widget.client.auditEvents();
      final approvals = await widget.client.approvals();
      if (!mounted) return;
      setState(() {
        _events = events;
        _approvals = approvals;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (e.isUnauthorized) {
          _unauthorized = true;
        } else {
          _error = e.detail.isEmpty ? 'Failed to load admin data' : e.detail;
        }
      });
    }
  }

  Color _actionColor(String action) {
    if (action.contains('CREATE') || action.contains('OPEN')) {
      return Colors.green;
    }
    if (action.contains('FREEZE') || action.contains('CLOSE') ||
        action.contains('CANCEL')) {
      return Colors.orange;
    }
    if (action.contains('FAIL') || action.contains('REJECT')) {
      return Colors.red;
    }
    return Colors.blueGrey;
  }

  Widget _chip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.7), width: 1),
      ),
      child: Text(
        label,
        style: Theme.of(context)
            .textTheme
            .labelMedium
            ?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }

  Color _statusColor(String status) => switch (status.toLowerCase()) {
        'approved' || 'accepted' => Colors.green,
        'rejected' || 'denied' => Colors.red,
        _ => Colors.amber.shade800,
      };

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_unauthorized || !_isAdmin) {
      return _buildGate();
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline,
                  size: 48, color: Theme.of(context).colorScheme.error),
              const SizedBox(height: 12),
              Text(_error!),
              const SizedBox(height: 16),
              FilledButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Audit trail (append-only)',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Immutable record of governance actions on the Identity origin.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            if (_events.isEmpty)
              Text('No audit events.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant))
            else
              for (final event in _events)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            _chip(event.action, _actionColor(event.action)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${event.actor} · ${event.at.toLocal().toString().split('.').first}',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurfaceVariant),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('Target: ${event.target}',
                            style: Theme.of(context).textTheme.bodyMedium),
                        if (event.detail.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(event.detail,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant)),
                        ],
                      ],
                    ),
                  ),
                ),
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 16),
            Text('Pending approvals',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            if (_approvals.isEmpty)
              Text('No pending approvals.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant))
            else
              for (final approval in _approvals)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.hourglass_top_outlined),
                    title: Text(approval.summary),
                    subtitle: Text(
                        '${approval.kind} · ${approval.at.toLocal().toString().split('.').first}'),
                    trailing: _chip(approval.status,
                        _statusColor(approval.status)),
                  ),
                ),
          ],
        ),
      ),
    );
  }

  Widget _buildGate() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.admin_panel_settings_outlined,
                size: 48, color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text('Admin access required',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              _unauthorized
                  ? 'You are not signed in. Log in with an admin account '
                      '(e.g. admin@campus.edu) on the Session page first.'
                  : 'Your account does not have the admin role. Log in with '
                      'an admin account on the Session page to view the audit '
                      'trail.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh),
              label: const Text('Check again'),
            ),
          ],
        ),
      ),
    );
  }
}
