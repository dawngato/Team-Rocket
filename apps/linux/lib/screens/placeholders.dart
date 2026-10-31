import 'package:flutter/material.dart';

/// Placeholder body for the 8 shell destinations. Each is replaced by its
/// real page in Phase 2 (branch noted) — placeholders keep the shell
/// navigable and testable from day one.
class PagePlaceholder extends StatelessWidget {
  const PagePlaceholder({
    super.key,
    required this.title,
    required this.icon,
    required this.branch,
    required this.blurb,
  });

  final String title;
  final IconData icon;
  final String branch;
  final String blurb;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircleAvatar(
              radius: 44,
              backgroundColor: scheme.secondaryContainer,
              child: Icon(icon, size: 44, color: scheme.onSecondaryContainer),
            ),
            const SizedBox(height: 24),
            Text(title, style: text.headlineSmall),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                border: Border.all(color: scheme.outline),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(branch,
                  style: text.labelMedium!.copyWith(color: scheme.secondary)),
            ),
            const SizedBox(height: 16),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Text(
                blurb,
                textAlign: TextAlign.center,
                style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ),
            const SizedBox(height: 24),
            Text('Phase 2 — coming soon', style: text.labelLarge),
          ],
        ),
      ),
    );
  }
}
