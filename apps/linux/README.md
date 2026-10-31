# HimVote Linux Application

This is the Linux client for HimVote — the modern **Flutter** application is the primary client, alongside the original Python/Tk desktop client and CLI auditor.

## Flutter application (primary, recommended)

The Flutter port is the current, actively developed Linux client. It is a single cross-platform codebase (same app builds for Linux, Windows, macOS, Android, iOS and web) with a Material 3 design system, classic-light (white) default theme with dark-mode and WCAG AAA high-contrast toggles, and the full set of HimVote screens: Elections, Receipt Verification, Audit Explorer, Architecture/Explain, Trust Model, Session, Settings, and Admin Audit.

Run it (requires the [Flutter SDK](https://flutter.dev)):
```bash
cd apps/linux
flutter run -d linux      # native Linux desktop build
flutter run -d chrome     # or web preview of the same code
```
Tests: `flutter test` (Phase 1 foundation + Phase 2 screens). A development mock `/v1` server for all three origins lives in `apps/linux/dev/mock_v1_server.py`.

## Python client (legacy / CLI auditor)

The original Python/Tk client (`himvote_linux.py`) is retained for its command-line archive inspection, Merkle verification, and report export modes. It is distinct from the Avalonia client in apps/desktop/HimVote.Linux.

The clients are development and educational prototypes. Their interface includes a local-demo disclosure that explains that ballot selections are stored locally and are not protected by an isolated voting enclave. Do not use this application to conduct a real election. Review the [repository status and limitations](../../README.md).

## Contents

- [Platform status](#platform-status)
- [Capabilities](#capabilities)
- [Architecture and files](#architecture-and-files)
- [Requirements](#requirements)
- [Run the graphical client](#run-the-graphical-client)
- [Command-line interface](#command-line-interface)
- [Settings and local data](#settings-and-local-data)
- [Archive and report workflow](#archive-and-report-workflow)
- [Verifier integration](#verifier-integration)
- [Tests](#tests)
- [Desktop integration and AppDir packaging](#desktop-integration-and-appdir-packaging)
- [Security and privacy limitations](#security-and-privacy-limitations)
- [Troubleshooting](#troubleshooting)
- [Release readiness](#release-readiness)
- [Related documentation](#related-documentation)

## Platform status

The primary application is apps/linux/himvote_linux.py. It uses Python's Tkinter and ttk libraries and the Python standard library for its built-in client features. The program imports tkinter at startup, including when invoked in headless mode, so the Python installation still needs Tkinter available even when no display is opened.

The client contains a local election store and demonstrations, API origin settings, receipt wallet, archive inspector, Merkle visualization, report export, and an optional child-process integration with the repository verifier. These functions are useful for development and review but do not make the client an independent election authority.

## Capabilities

The graphical application contains views for:

| View | Purpose |
| --- | --- |
| Elections | Browse and filter local or service-provided election information. The page includes an explicit local-demo disclosure. |
| Receipt | Inspect receipt information and display its status and proof-related fields. |
| Audit | Load election evidence, inspect records, and display audit results. |
| How it works | Explain the prototype trust flow. |
| Security limits | Explain system limitations and operator assumptions. |
| Session | Demonstrate sign-in and role presentation. |
| Settings | Configure identity, casting, and witness origins and inspect connectivity. |
| Admin | Demonstrate administration-oriented controls and audit information. |

The exact data source depends on the view and whether an API base has been configured. Some screens use local demonstration data. Look for the LOCAL DEMO label and verify the source before relying on a displayed value.

## Architecture and files

Paths are relative to this directory.

| Path | Contents |
| --- | --- |
| himvote_linux.py | Tkinter application, local stores, archive handling, origin checks, report generation, and CLI entry point. |
| preview.html | Static interactive HTML preview served by the optional preview mode. It is separate from the Tk application. |
| assets/icons/himvote.svg | Linux desktop icon asset. |
| candidates | Local candidate image assets used by the interface. |
| desktop/himvote.desktop | Desktop launcher and desktop actions. |
| desktop/io.himvote.HimVote.metainfo.xml | AppStream metadata. |
| desktop/himvote.1 | Manual page source. |
| desktop/himvote-completion.bash | Bash completion source. |
| desktop/build_standalone.py | Creates a Linux AppDir directory with launcher and metadata. |
| tests | Pytest coverage for the GUI, local stores, archive parsing, receipt wallet, and packaging metadata. |

The desktop AppDir script copies a Python script and integration files. Its AppRun launches system python3. It does not bundle Python or create a complete self-contained AppImage by itself.

## Requirements

- Python 3.12 or newer is recommended to match the repository's current Python development baseline.
- A Python build that includes Tkinter. On Debian or Ubuntu this is commonly provided by the python3-tk package.
- X11 or Wayland and a functioning display session for the graphical client.
- Pytest for the test suite.
- Optional Xvfb for GUI-oriented tests on a headless CI host.
- The repository checkout if using the default verifier path or repository fixtures.

The core GUI/CLI code imports Python standard-library modules. The separate verifier may have its own dependencies; use the [verifier README](../../verifier/README.md) for that tool's setup.

## Run the graphical client

From the repository root:

    python3 apps/linux/himvote_linux.py

Select Settings to review the identity, casting, and witness origins. The source defaults are local loopback addresses:

- Identity: http://localhost:8080
- Casting: http://localhost:8081
- Witness: http://localhost:8082

These are development defaults. They may not match the repository's current Compose gateway mapping or a deployed environment. Configure and test each origin explicitly.

To select the first view:

    python3 apps/linux/himvote_linux.py --view elections
    python3 apps/linux/himvote_linux.py --view settings
    python3 apps/linux/himvote_linux.py --view audit

Supported view values are elections, receipt, audit, how_it_works, security_limits, session, settings, and admin.

## Command-line interface

Display the current arguments:

    python3 apps/linux/himvote_linux.py --help

The app supports the following options:

| Option | Purpose |
| --- | --- |
| --api-base URL | Set the API base for this invocation. |
| --verifier PATH | Select the verifier script used by the graphical audit workflow. The default path is verifier/verify.py relative to the current working directory. |
| --archive PATH | Open an archive file or directory at launch, or supply the archive required for headless mode. |
| --headless | Run archive inspection/report behavior without creating the graphical window. |
| --verify-receipt HANDLE | Check for a receipt handle within a headless archive audit. |
| --export-report PATH | Export a report based on a .md or .json extension. |
| --export-md PATH | Write a Markdown report. |
| --export-json PATH | Write a JSON report. |
| --check-origins | Check the configured/default identity, casting, and witness endpoints. |
| --view NAME | Select the initial GUI view. |
| --web-preview [PORT] | Serve the static HTML preview, using port 8085 when no port is supplied. |
| --version | Print the client version string. |

Examples from the repository root:

    python3 apps/linux/himvote_linux.py --check-origins
    python3 apps/linux/himvote_linux.py --api-base http://localhost:8080 --check-origins
    python3 apps/linux/himvote_linux.py --view settings
    python3 apps/linux/himvote_linux.py --web-preview

Headless archive mode requires --archive:

    python3 apps/linux/himvote_linux.py --headless --archive fixtures/simulation_run/export

Inspect a receipt handle and export both report formats:

    python3 apps/linux/himvote_linux.py \
      --headless \
      --archive fixtures/simulation_run/export \
      --verify-receipt RECEIPT_HANDLE \
      --export-md /tmp/himvote-audit.md \
      --export-json /tmp/himvote-audit.json

Replace RECEIPT_HANDLE with a handle present in the selected archive. A failure to find or validate an item should be treated as a failed or incomplete local check, not as proof that a remote system accepted a ballot.

The headless checker and its generated files are local tooling. Markdown or JSON output is not a signed audit report unless a separate signing mechanism has been applied and verified.

## Settings and local data

The settings store uses the XDG configuration directory when configured:

- If XDG_CONFIG_HOME is set: XDG_CONFIG_HOME/himvote/settings.json.
- Otherwise: ~/.config/himvote/settings.json.

The receipt wallet uses the XDG data directory when configured:

- If XDG_DATA_HOME is set: XDG_DATA_HOME/himvote/receipts.json.
- Otherwise: ~/.local/share/himvote/receipts.json.

These files are local application state. Protect them according to the sensitivity of the data on the workstation. Do not use them as a substitute for a server-side authoritative record or place secrets into a shared home directory.

To use a different XDG location for one command:

    XDG_CONFIG_HOME=/tmp/himvote-config XDG_DATA_HOME=/tmp/himvote-data \
      python3 apps/linux/himvote_linux.py --view settings

The Settings view persists configured service origins. The command-line --api-base flag configures the invocation's API client and origin check; it does not automatically rewrite all persisted settings.

## Archive and report workflow

The audit interface can open a directory or supported archive formats such as ZIP and tar.gz. The CLI accepts the path through --archive. Reports can be emitted in Markdown or JSON using --export-md, --export-json, or the extension-sensitive --export-report option.

Keep evidence inputs read-only where possible. Record the archive source, file digest, trust inputs, verifier version, and command used alongside any report. Do not treat the name or appearance of an archive as proof that it came from a trusted election service.

Use the committed development fixture for a reproducible local walkthrough:

    python3 apps/linux/himvote_linux.py --headless --archive fixtures/simulation_run/export --export-md /tmp/himvote-report.md

The fixture is synthetic development data. Its result demonstrates the local tool's behavior on that fixture only.

## Verifier integration

The graphical audit workflow can invoke the repository verifier as a child process. The default verifier argument is verifier/verify.py and is resolved from the process's current working directory. From the repository root this path points to the expected verifier source.

For a different checkout layout:

    python3 apps/linux/himvote_linux.py --verifier /absolute/path/to/verifier/verify.py --view audit

The verifier process is not sandboxed by the Tk client. A separate process, cleared proxy variables, or a checksum check does not create a firewall boundary. Review [verifier documentation](../../verifier/README.md), validate trust inputs independently, and use an operating-system sandbox or isolated machine if network access must be prevented.

## Tests

Install pytest in an isolated Python environment if it is not already available:

    python3 -m venv .venv
    . .venv/bin/activate
    python -m pip install --upgrade pip pytest

Run from the repository root:

    python3 -m pytest apps/linux/tests -v

Some tests instantiate Tk widgets and need a display. On a headless Linux system with Xvfb installed:

    xvfb-run -a python3 -m pytest apps/linux/tests -v

The tests cover local application behavior, archive handling, receipts, UI state, and desktop metadata. They do not prove that a deployed API is available or that this tool is an independent election verifier.

## Desktop integration and AppDir packaging

The AppDir script prepares desktop integration files and a launcher:

    python3 apps/linux/desktop/build_standalone.py --output dist

The default output directory is ~/dist. The resulting directory is normally dist/HimVote.AppDir. AppRun invokes system python3, so Python and Tkinter must be present on the target machine.

This command creates an AppDir structure only. It does not create an AppImage, Debian package, RPM, signed package, or bundled Python runtime. Use a separately reviewed packaging toolchain if those artifacts are needed.

Other desktop integration files:

- desktop/himvote.desktop defines the desktop launcher and actions.
- desktop/io.himvote.HimVote.metainfo.xml contains AppStream metadata.
- desktop/himvote.1 is the manual page source.
- desktop/himvote-completion.bash provides Bash completion.
- assets/icons/himvote.svg is the scalable icon.

Install these files through a package manager or user-level FreeDesktop directories only after reviewing the destination and permissions. Do not copy test artifacts into system directories as a substitute for packaging.

## Security and privacy limitations

- The client explicitly identifies its election experience as a local demonstration.
- Local ballot selection in the demo is not protected by an isolated cryptographic booth.
- Local session, receipt, and settings files are not hardware-backed secure storage.
- The application imports and displays evidence; local display does not establish independent trust in that evidence.
- Reports generated by the tool are not automatically signed.
- Origin health checks show reachability, not service correctness, authorization, or security.
- The Settings view's default loopback ports may not match the active deployment.
- The Python headless mode imports Tkinter at process startup even though it does not open a window.
- Running an external verifier does not sandbox it or guarantee it is offline.
- The broader repository still uses a custom development voting engine and has independent-witness release blockers.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| No module named tkinter | Install the Tkinter package for the active Python interpreter, commonly python3-tk on Debian/Ubuntu. |
| No display name and no $DISPLAY | Run the GUI inside an X11/Wayland session or use xvfb-run for supported tests. CLI mode still requires the tkinter Python module to import. |
| API check reports OFFLINE | Confirm the origin, port, service health, DNS, and firewall. The default origins are local placeholders. |
| Archive cannot be loaded | Confirm the path exists, is readable, and has a supported archive format. Use an extracted directory to isolate archive-format issues. |
| Receipt is not found | Confirm the exact handle exists in the selected archive; a receipt is not searched globally on the server. |
| Verifier exits with an error | Check the verifier path relative to the current working directory, interpreter dependencies, input paths, trust files, and stderr. |
| AppDir does not run on another machine | Install compatible Python and Tkinter on that machine; the current AppDir does not embed the runtime. |
| AppImage expected but not present | build_standalone.py creates an AppDir, not an AppImage. |

## Release readiness

Before distributing this client beyond a controlled demonstration:

1. Replace the local-only ballot selection demo with the approved external booth handoff.
2. Remove or disable synthetic accounts and local privilege paths.
3. Configure and verify identity, casting, and witness origins.
4. Review archive handling, trust pin provenance, verifier digest handling, and report semantics.
5. Add secure handling for local session and receipt data.
6. Test keyboard navigation, screen-reader labels, high contrast, reduced motion, scaling, and supported desktop environments.
7. Build and test a real distribution package with a defined update and signature process.
8. Review the repository's engine, witness, key custody, and election authority release gates.

## Related documentation

- [Repository overview and release limitations](../../README.md)
- [Standalone verifier guide](../../verifier/README.md)
- [Linux desktop integration assets](desktop)
- [Avalonia .NET Linux client](../desktop/README.md)
- [Synthetic local fixture](../../fixtures/simulation_run/export)
