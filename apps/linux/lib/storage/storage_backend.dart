import 'file_store.dart';
import 'file_store_stub.dart'
    if (dart.library.io) 'file_store_io.dart'
    if (dart.library.html) 'file_store_web.dart' as impl;
import 'home_stub.dart'
    if (dart.library.io) 'home_io.dart'
    if (dart.library.html) 'home_web.dart' as homeenv;

/// Platform-selected store. On the VM (flutter test, Linux desktop) this is
/// the real XDG file store; on web it is localStorage. Pass [home] /
/// [xdgDataHome] / [xdgConfigHome] to override resolution (tests).
FileStore createPlatformFileStore(
  StoreNamespace namespace, {
  String? home,
  String? xdgDataHome,
  String? xdgConfigHome,
}) {
  final paths = XdgPaths.resolve(
    home: home ?? (homeenv.defaultHome() ?? ''),
    xdgDataHome: xdgDataHome,
    xdgConfigHome: xdgConfigHome,
  );
  final root = namespace == StoreNamespace.data
      ? paths.himvoteDataDir
      : paths.himvoteConfigDir;
  return impl.createStore(root);
}

/// Convenience: the two stores the app needs, constructed together.
class PlatformStores {
  final FileStore data;
  final FileStore config;

  const PlatformStores({required this.data, required this.config});

  factory PlatformStores.create({
    String? home,
    String? xdgDataHome,
    String? xdgConfigHome,
  }) =>
      PlatformStores(
        data: createPlatformFileStore(StoreNamespace.data,
            home: home, xdgDataHome: xdgDataHome, xdgConfigHome: xdgConfigHome),
        config: createPlatformFileStore(StoreNamespace.config,
            home: home, xdgDataHome: xdgDataHome, xdgConfigHome: xdgConfigHome),
      );
}
