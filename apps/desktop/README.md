# HimVote .NET Desktop Clients

This directory contains the shared .NET desktop code and two native desktop shells:

- HimVote.Linux is an Avalonia desktop application for Linux.
- HimVote.Windows contains a WinUI desktop application path for Windows.
- HimVote.Core contains shared models, services, and view-model support.
- HimVote.Windows.Tests contains xUnit tests covering shared and platform project code.

This is separate from apps/linux, which contains a Python/Tk desktop client and its own command-line audit interface. The two Linux applications have different implementations and build commands.

HimVote is a development and demonstration prototype. Building a desktop executable does not prove election security, production suitability, independent witness operation, or release readiness. Read the [repository overview](../../README.md) for current limitations.

## Contents

- [Project status](#project-status)
- [Project map](#project-map)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Build and run on Linux](#build-and-run-on-linux)
- [Build and run on Windows](#build-and-run-on-windows)
- [Tests](#tests)
- [Configuration](#configuration)
- [Security and audit boundaries](#security-and-audit-boundaries)
- [Packaging and signing](#packaging-and-signing)
- [Troubleshooting](#troubleshooting)
- [Release review](#release-review)
- [Related documentation](#related-documentation)

## Project status

The solution file is HimVote.Windows.sln. It includes the Windows shell, the Linux Avalonia shell, the shared Core project, and the xUnit test project.

The Linux shell targets net8.0 and uses Avalonia 11.2.8. The Windows project conditionally targets WinUI and a Windows 10 SDK on Windows. When built on a non-Windows operating system, the Windows project switches to a net8.0 compatibility library and includes source stubs; that is useful for shared code/test compatibility but does not produce a runnable Windows app.

The repository does not include an installer or a documented signed desktop release pipeline. A successful compile is a development result only.

## Project map

Paths below are relative to apps/desktop.

| Project/path | Responsibility |
| --- | --- |
| HimVote.Windows.sln | Solution containing all .NET desktop projects and tests. |
| HimVote.Core | Shared election, receipt, audit models; API and secure-store interfaces; evidence import, trust pins, verifier runner, report export, update abstraction, and view models. |
| HimVote.Linux | Avalonia application, Linux-specific services, XAML pages, converters, and main-window view model. |
| HimVote.Windows | WinUI application path, Windows views, service implementations, and Windows-specific models/view models. |
| HimVote.Windows.Tests | xUnit test project with Moq and Microsoft.NET.Test.Sdk. |
| apps/web | A nested web README and package for the separate web interface; it is not the desktop shell. |
| services/himvote_api | A nested Python service/package with its own README and pyproject configuration. |
| verifier | A nested verifier integration README and support code. |
| contracts | Contract documentation and support files. |

The Windows and Linux projects have some platform-specific copies of models and view models. Check both implementations when changing a user-facing workflow or API contract.

## Architecture

The shell uses Model-View-ViewModel style separation and CommunityToolkit.Mvvm. XAML views bind to view models; services provide HTTP, session storage, external trust pins, archive import, report export, update information, and verifier execution.

Important service responsibilities include:

- ApiClient sends requests to a configured API base and attaches the current bearer token.
- SecureStore or LinuxSecureStore persists session information using platform-specific mechanisms.
- EvidenceImporter handles evidence archive import and validates extraction paths and archive limits.
- TrustPinStore loads trust information selected by the user.
- VerifierRunner invokes a verifier process and checks its configured digest before execution.
- ReportExporter creates Markdown and JSON summaries.
- UpdateService exposes version/channel information; it does not imply that signed updates are published.

Running the verifier as a child process is process separation, not an operating-system sandbox. Environment cleanup such as clearing proxy variables does not prevent the child process from accessing the network. Review verifier behavior and run it in a separately controlled environment when network isolation is required.

## Requirements

### Shared development

- .NET 8 SDK.
- NuGet package restore access.
- Git checkout of the complete repository, because some verifier and fixture paths are repository-relative.

### Linux desktop

- A supported Linux desktop session with X11 or Wayland as needed by Avalonia's platform backend.
- A compatible .NET 8 runtime if publishing framework-dependent output.
- A display server for interactive UI runs. Headless CI may build and run unit tests without opening a window.

### Windows desktop

- Windows 10 or 11 with a compatible Windows SDK.
- Visual Studio 2022 or .NET 8 SDK with WinUI/Windows App SDK build support.
- Windows App SDK packages restored from NuGet.
- A Windows machine for compiling, launching, signing, and packaging the actual WinUI app.

## Build and run on Linux

Run commands from apps/desktop:

Restore dependencies:

    dotnet restore HimVote.Windows.sln

Build all projects that are compatible with the current operating system:

    dotnet build HimVote.Windows.sln

Run the Avalonia client:

    dotnet run --project HimVote.Linux/HimVote.Linux.csproj

Build a framework-dependent Linux publish directory:

    dotnet publish HimVote.Linux/HimVote.Linux.csproj -c Release -r linux-x64 --self-contained false -o publish/linux-x64

Change linux-x64 to the intended RID only after confirming support in the installed .NET SDK and all dependencies. The publish directory is not automatically converted into a distribution package.

The default API base used by the shared Linux ApiClient is http://localhost:8080. This is suitable only when a compatible local gateway is listening on the same machine. Open the client settings and configure a reachable service origin for another environment. Do not assume container-only hostnames are resolvable from the desktop process.

## Build and run on Windows

Run commands from apps/desktop in Windows PowerShell, a Visual Studio Developer Command Prompt, or another shell configured with the Windows SDK:

    dotnet restore HimVote.Windows.sln
    dotnet build HimVote.Windows.sln -c Debug -p:Platform=x64
    dotnet run --project HimVote.Windows/HimVote.Windows.csproj -p:Platform=x64

Visual Studio can open HimVote.Windows.sln. Select the Windows project, target architecture, and a local Windows debugging target. A non-Windows build of HimVote.Windows is only its compatibility path and cannot be used to validate the WinUI UI.

The current default API base is http://localhost:8080. Verify that it is appropriate for the intended local gateway, and set a reviewed HTTPS endpoint for any controlled remote test. The code or UI configuration must be checked to ensure that the selected base is actually used by all services.

## Tests

The solution includes an xUnit test project:

    dotnet test HimVote.Windows.sln

For more diagnostic output:

    dotnet test HimVote.Windows.sln --logger "console;verbosity=normal"

Tests cover view-model behavior and shared services, including login, elections, candidates, receipts, administrative actions, evidence import, trust pins, and verifier/report handling. The solution test run on Linux does not test actual WinUI behavior on Windows. Add platform-specific smoke testing for each supported operating system before distribution.

## Configuration

The desktop clients use a configurable API base, with source defaults pointing at localhost:8080. The exact configuration screen and persistence path differ between the Windows and Avalonia shells. Confirm the configured URL in the active client rather than assuming that an environment variable or appsettings file is consumed.

For local development:

1. Start the gateway or API service on a host reachable by the desktop process.
2. Open the client settings.
3. Set the API origin to the gateway address, including scheme and port.
4. Save settings and use the connectivity/status display to verify the host.
5. Confirm the service routes and API paths match the current client contract.

Do not use production credentials with a local demo client. Do not store passwords or private keys in tracked configuration files.

## Security and audit boundaries

The desktop audit explorer can import local evidence and display verifier output. It must not claim independent verification unless the actual verifier and trusted inputs were independently reviewed.

Important boundaries:

- The external verifier process is not isolated by network policy simply because it is launched separately.
- A checksum check protects against unexpected local verifier changes only if the expected digest itself is obtained through a trusted independent channel.
- A user-selected trust-pin file remains user-provided trust input; the UI cannot prove the selected key belongs to the intended institution.
- Archive path checks reduce extraction risk but do not replace keeping the application and runtime updated.
- Local chain or witness demonstrations do not prove independent consensus or independent custody.
- A report generated on a workstation is not a digital signature unless an actual signing step and verified identity are present.
- A local receipt cache is not the authoritative casting ledger.

The Windows secure store and Linux secure store are separate implementations. Review their platform-specific behavior, backup and migration rules, memory handling, and error paths before making a credential-protection claim.

## Packaging and signing

The repository does not currently provide a complete signed MSIX installer or a Linux AppImage for this .NET client. The dotnet publish command creates publish output only. It does not sign the application, create an installer, establish an update channel, or prove the output came from a trusted CI run.

Before packaging:

- Choose an application identifier and versioning policy.
- Add platform-specific package manifests and icons.
- Configure signing outside source control.
- Review auto-update behavior and update metadata.
- Retain checksums, build provenance, and deployment records.
- Test installation, update, rollback, and removal on clean machines.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| Restore fails | Confirm .NET 8 SDK installation, NuGet network access, and any proxy configuration. |
| WinUI project fails on Linux | Linux builds use a compatibility library path; use Windows with the Windows SDK to build and run the real WinUI app. |
| Avalonia window does not open | Confirm a supported display session, Linux desktop dependencies, and that the Linux project rather than the Python client is being launched. |
| API returns connection refused | Confirm the gateway is listening and that the configured URL is reachable from the desktop process. |
| Verifier does not start | Confirm the verifier path, execution permissions, Python/runtime requirements, expected digest, and captured stderr. |
| Evidence import is rejected | Check archive format, file limits, path validity, and whether trust pins are outside the evidence directory as required by the workflow. |
| Publish output is not installable | dotnet publish is not an installer; use a separately configured packaging and signing pipeline. |

## Release review

Before shipping a desktop client:

1. Build and launch on the target operating system and architecture.
2. Verify API origins, TLS, session storage, and authentication behavior.
3. Test package installation and upgrade behavior on a clean machine.
4. Review safe archive handling and verifier invocation.
5. Confirm the verifier digest and trust pins through independent sources.
6. Verify keyboard navigation, screen-reader semantics, high contrast, scaling, and display resizing.
7. Ensure logs and crash reports exclude tokens, credential secrets, and raw ballots.
8. Sign artifacts with protected CI credentials and retain provenance.
9. Close the system-level established-engine and independent-witness release gates.

## Related documentation

- [Repository overview](../../README.md)
- [Linux Avalonia project](HimVote.Linux/HimVote.Linux.csproj)
- [Windows WinUI project](HimVote.Windows/HimVote.Windows.csproj)
- [Shared Core project](HimVote.Core/HimVote.Core.csproj)
- [Test project](HimVote.Windows.Tests/HimVote.Windows.Tests.csproj)
- [Separate Python Linux client](../linux/README.md)
