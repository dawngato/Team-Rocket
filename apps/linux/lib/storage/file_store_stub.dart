import 'file_store.dart';

/// Fallback for platforms that are neither VM nor web (unreachable in
/// practice — surfaced as a loud failure instead of silent data loss).
class UnsupportedFileStore extends RootedFileStore {
  const UnsupportedFileStore(super.rootDir);

  @override
  Future<String?> read(String relativePath) =>
      throw UnsupportedError('No storage backend for this platform');

  @override
  Future<void> write(String relativePath, String contents) =>
      throw UnsupportedError('No storage backend for this platform');

  @override
  Future<void> remove(String relativePath) =>
      throw UnsupportedError('No storage backend for this platform');
}

FileStore createStore(String rootDir) => UnsupportedFileStore(rootDir);
