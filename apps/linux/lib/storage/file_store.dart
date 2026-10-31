/// Storage contracts — MIGRATION_SPEC.md rule: keep the SAME XDG paths the
/// tkinter app used, so state stays compatible:
///   receipts: $XDG_DATA_HOME/himvote/receipts.json
///   settings: $XDG_CONFIG_HOME/himvote/settings.json
/// (NOT shared_preferences.)
library;

/// Thin file abstraction so the same stores work on Linux (real files),
/// web preview (localStorage) and in tests (in-memory/temp dirs).
abstract class FileStore {
  /// Returns null when the file does not exist.
  Future<String?> read(String relativePath);

  /// Creates parent directories as needed.
  Future<void> write(String relativePath, String contents);

  Future<void> remove(String relativePath);
}

/// Which XDG tree a store belongs to.
enum StoreNamespace { data, config }

/// XDG base-dir resolution with injectable env for tests.
///
/// Linux defaults per the XDG Base Directory spec:
///   data   -> $XDG_DATA_HOME   or ~/.local/share
///   config -> $XDG_CONFIG_HOME  or ~/.config
class XdgPaths {
  final String dataHome;
  final String configHome;

  const XdgPaths({required this.dataHome, required this.configHome});

  factory XdgPaths.resolve({String? home, String? xdgDataHome, String? xdgConfigHome}) {
    final h = (home != null && home.isNotEmpty) ? home : null;
    return XdgPaths(
      dataHome: xdgDataHome ?? '${h ?? ''}/.local/share',
      configHome: xdgConfigHome ?? '${h ?? ''}/.config',
    );
  }

  String get himvoteDataDir => '$dataHome/himvote';
  String get himvoteConfigDir => '$configHome/himvote';
}

/// Base class for the two platform impls; holds the himvote root dir.
abstract class RootedFileStore implements FileStore {
  final String rootDir;

  const RootedFileStore(this.rootDir);

  String resolve(String relativePath) =>
      relativePath.contains('..') ? '' : '$rootDir/$relativePath';
}
