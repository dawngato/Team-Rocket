# HimVote Android Application

This README describes the Android project in this directory: its Kotlin and Jetpack Compose structure, local build workflow, app-link configuration, network behavior, tests, and current integration limitations.

HimVote is a prototype for local development and controlled demonstrations. Source code, a debug APK, or a passing local unit test is not evidence that the application is ready for a real election. Review the [repository status and limitations](../../README.md) before describing any security or release guarantee.

## Contents

- [Platform status](#platform-status)
- [Application scope](#application-scope)
- [Architecture](#architecture)
- [Source layout](#source-layout)
- [Requirements](#requirements)
- [Build and run](#build-and-run)
- [Configuration](#configuration)
- [Booth handoff and return links](#booth-handoff-and-return-links)
- [Networking and TLS](#networking-and-tls)
- [Storage and privacy](#storage-and-privacy)
- [Tests and quality checks](#tests-and-quality-checks)
- [Build outputs and signing](#build-outputs-and-signing)
- [Troubleshooting](#troubleshooting)
- [Pre-release review](#pre-release-review)
- [Related documentation](#related-documentation)

## Platform status

The Android project is a single Gradle application module named app. It uses Kotlin, Jetpack Compose, Material 3, AndroidX Navigation, ViewModel, Hilt, Retrofit, OkHttp, and AndroidX encrypted storage dependencies.

The source provides login, election browsing, candidate details, credential request, booth launch, receipt status, inclusion-proof, and results screens. The production API host and certificate pins in the source use example hostnames and values. The checked-in booth properties also use a reserved local hostname. They are development placeholders, not service endpoints or trust pins approved for production.

The repository's current election engine is Profile VEEM, a custom development adapter and not an independently reviewed election protocol. Local witness and chain demonstrations do not establish independent custody. See the root README for release limitations.

## Application scope

The Android app is designed as a voter-facing client. The main navigation destinations are:

| Screen | Purpose |
| --- | --- |
| Login | Collects sign-in information and displays identity or MFA feedback. |
| Elections | Lists elections and current server-reported state. |
| Candidate details | Presents candidate and election information. |
| Credential | Requests or displays the election credential workflow. |
| Voting | Starts the configured external booth handoff. The Android app does not provide an in-app WebView ballot surface. |
| Receipt | Shows the receipt status returned by the casting service. |
| Inclusion proof | Displays and checks the Merkle inclusion path available to the client. |
| Results | Displays published results returned by the service. |

The screen set is defined in app/src/main/java/com/himvote/ui/navigation/Screen.kt and implemented under ui/screens. Each user-visible success state should be tied to a service response or a local cryptographic check that the code actually performs.

## Architecture

The Android application uses a single activity and a Compose navigation host. The broad data path is:

1. UI screens collect input and observe ViewModel state.
2. ViewModels coordinate asynchronous work and expose UI state.
3. Repositories group authentication, election, credential, voting, and result operations.
4. Retrofit and OkHttp perform HTTP communication.
5. EncryptedStorage persists selected session and receipt data.
6. Hilt modules construct the storage, network client, repositories, and application graph.

Directory responsibilities:

| Directory | Responsibility |
| --- | --- |
| data/models | Request and response data structures. |
| data/network | Retrofit service interface and OkHttp API client. |
| data/repository | Authentication, election, credential, voting, and result operations. |
| data/storage | Encrypted local storage implementation. |
| di | Hilt dependency-injection modules. |
| ui/components | Shared Compose controls, cards, status elements, and feedback. |
| ui/navigation | Route names and navigation host. |
| ui/screens | Screen and ViewModel implementations. |
| ui/theme | Compose colors, typography, and theme construction. |
| util | Design tokens, state badges, accessibility helpers, proof helpers, and casting guards. |

## Source layout

The paths below are relative to this directory:

| Path | Contents |
| --- | --- |
| settings.gradle.kts | Gradle project name, repositories, and included modules. |
| build.gradle.kts | Root plugin versions. |
| gradle/wrapper | Gradle wrapper configuration and scripts. |
| gradle.properties | Gradle behavior and currently checked-in local booth sample values. |
| app/build.gradle.kts | Android SDK levels, build types, dependencies, and booth build fields. |
| app/src/main/AndroidManifest.xml | Application and activity declarations, permissions, and booth return intent filters. |
| app/src/main/java/com/himvote | Kotlin app source. |
| app/src/main/res | Android strings, theme resources, backup rules, and network security configuration. |
| app/src/test/java/com/himvote | Local JVM unit tests. |

## Requirements

- Android Studio with a compatible Android Gradle Plugin 8.7.3.
- JDK 17.
- Android SDK Platform 34 and a compatible build-tools installation.
- An Android emulator or device for installation and interactive checks.
- Network access for the Gradle wrapper and Maven dependencies on the first build.

The Gradle wrapper is configured for Gradle 8.13. Use the checked-in wrapper rather than a separately installed Gradle version.

## Build and run

Run commands from apps/android.

Check that Gradle can enumerate the project tasks:

    ./gradlew tasks

Compile the debug variant:

    ./gradlew assembleDebug

Build a debug APK for the deployed gateway on port 80:

    ./gradlew assembleDebug

The debug API client defaults to `http://13.232.47.32/`. The APK is written to app/build/outputs/apk/debug/app-debug.apk. For another server, rebuild with a different himvote.apiBaseUrl value.

Install the debug variant on a running emulator or connected device:

    ./gradlew installDebug

To install the build configured for the current deployed gateway:

    ./gradlew installDebug

Run the local JVM unit tests:

    ./gradlew testDebugUnitTest

Build output for the debug APK is normally written under:

    app/build/outputs/apk/debug/

Android Studio can also open this directory as a Gradle project. Allow the initial Gradle sync to finish before editing or launching the app.

The debug default is the deployed API gateway at `http://13.232.47.32/`, reachable by both emulator and physical device when the device has network access. For a local backend on the Android Emulator host, override it with `-Phimvote.apiBaseUrl=http://10.0.2.2:8080/`. The `10.0.2.2` alias is emulator-only and does not work on a physical device.

## Configuration

### API origin

The ApiClient has a debug fallback of `http://13.232.47.32/` and a release fallback of `https://api.himvote.example.in/`. The release hostname is an example value. The Gradle property `himvote.apiBaseUrl` configures the debug API origin only; the checked-in value points to the deployed gateway. Release builds use `himvote.releaseApiBaseUrl`, which must be an HTTPS origin, or fall back to the example hostname when unset. Both values are compiled through `BuildConfig.API_BASE_URL` for their respective build variant.

The deployed gateway at `13.232.47.32` currently responds on plain HTTP port 80, while port 8080 is not externally reachable. The debug default points to `http://13.232.47.32/`, and Retrofit appends the service's `/v1/...` routes. For a local emulator backend, override the default with `-Phimvote.apiBaseUrl=http://10.0.2.2:8080/`; a physical Android device cannot use that emulator-only alias. Do not put service passwords, credentials, private keys, or ballot choices in Gradle properties or URLs.

### Booth and return-link properties

The Android Gradle build reads these project properties:

| Property | Purpose |
| --- | --- |
| himvote.boothBaseUrl | HTTPS election booth entry URL. |
| himvote.returnUrl | URL supplied to the booth as the desired return address. |
| himvote.returnHost | Host substituted into the HTTPS app-link intent filter. |

The checked-in `gradle.properties` currently contains demo values for `13.232.47.32/student`. The booth URL and return URL use HTTP, while the manifest's verified App Link requires HTTPS and the `/booth/return` path. These values therefore do not describe a verified production booth handoff. Replace them with reviewed values for the booth environment before testing that flow or producing a release build. For local development, pass values on the command line or use an untracked local Gradle properties file:

    ./gradlew assembleDebug \
      -Phimvote.boothBaseUrl=https://your-dev-host.example/booth \
      -Phimvote.returnUrl=https://your-dev-host.example/booth/return \
      -Phimvote.returnHost=your-dev-host.example

The command values above are examples; substitute a host that you control and can test. Do not commit real private configuration or signing credentials.

The current manifest filter accepts the configured host over HTTPS with the `/booth/return` path prefix, while the checked-in demo `returnUrl` is `http://13.232.47.32/student/elections`. Align the configured URL, host, scheme, and path with the booth's actual callback contract before testing a return flow. Android Gradle release tasks reject blank booth values, but nonempty demo values can still pass that guard; passing the guard does not make a host production-ready.

## Booth handoff and return links

The voting repository builds an HTTPS booth URL and opens it through Android browser/custom-tab integration. The manifest declares an HTTPS app link for the configured return host and a himvote://booth/return URI for local testing. The return handler validates the election context and asks the API for receipt status.

The source deliberately avoids implementing ballot encryption in the Android screen. Candidate selection and ballot handling belong to the configured booth contract. A redirect back to the app is not proof that a ballot was accepted or witnessed. The service response and any required proof checks must still be validated.

Before end-to-end booth testing, verify:

1. The booth uses HTTPS and is reachable from the device.
2. The configured return URL's hostname and path match the Android manifest filter.
3. Android App Links are associated and verified for the exact deployed domain.
4. The callback state and election identifier are validated.
5. The app fetches receipt status from the casting service and does not infer acceptance from the redirect alone.
6. No credential secret or ballot selection is exposed in browser history, referrer data, proxy logs, or navigation parameters.

## Networking and TLS

The OkHttp client has a bearer-token interceptor, timeouts, a transport guard, and a CertificatePinner configured for two example domains. Release requests must use HTTPS. Cleartext is enabled only by debug build resources for local troubleshooting; release resources deny cleartext. The example certificate pins and hostnames are placeholders, not approved production trust material.

These values must be reviewed together before deployment. The current API host, casting host, and pins are placeholders and are not evidence that production TLS pinning is correctly configured. Replace them with reviewed hosts and certificate pins, including a rotation plan and a recovery path before pin expiry.

The main application manifest and main network security configuration deny cleartext. The debug source set permits HTTP only for the deployed gateway and local development hosts. Release builds do not include that debug override, and the OkHttp transport guard rejects HTTP in release. The current gateway has no configured HTTPS hostname, so it is suitable only for the debug APK; configure a real HTTPS API origin and reviewed certificate pins before producing a usable release build. Do not pass an HTTP value for `himvote.apiBaseUrl` to a release build.

Avoid logging authorization headers, passwords, credential tokens, receipt secrets, or ballot payloads. HTTP logs should be disabled or aggressively redacted in release builds.

## Storage and privacy

EncryptedStorage is the local persistence boundary for session and ballot receipt state. Backup rules in app/src/main/res/xml are intended to exclude sensitive app data from device backup or transfer. Review the actual encryption key lifecycle and backup behavior on supported Android versions before release.

SingleCastChecker is a local client guard against accidental repeated submissions. It does not replace server-side replay prevention, credential uniqueness, or election protocol enforcement. Clearing app data or reinstalling can change local state; the server must remain authoritative.

The app should not persist raw ballot choices. Receipt identifiers and hashes should be retained only as required for voter verification and should not be added to analytics or crash reports.

## Tests and quality checks

The source includes local JVM tests under app/src/test/java/com/himvote. The test classes cover areas such as:

- Authentication and login ViewModel state.
- Election and candidate screen state.
- Credential, voting, and receipt flows.
- Single-cast local behavior.
- Booth return validation.
- Network pin configuration.
- Encrypted storage behavior.
- Merkle inclusion proof computations.
- Accessibility font scaling and design tokens.

Run the suite with:

    ./gradlew testDebugUnitTest

Run Android lint, when the installed Gradle plugin and SDK support the task:

    ./gradlew lintDebug

The tests are not a production security audit, and passing unit tests does not prove successful operation against a deployed identity or casting service.

## Build outputs and signing

The project defines debug and release build types. Debug builds use a debug application ID suffix. Release builds require nonblank booth properties and produce an Android package through Gradle.

No production signing secret belongs in this repository. Before distributing a release build, configure signing through a secure CI secret store or local untracked Gradle configuration, verify package identity and versioning, inspect the final manifest and endpoint configuration, and retain artifact provenance. The current Gradle release guard only checks that booth properties are nonempty; it does not validate domain ownership, TLS, App Link association, API reachability, certificate pin correctness, or signing.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| Gradle cannot find Java | Install JDK 17 and configure Android Studio or JAVA_HOME for that JDK. |
| Android SDK not found | Open the project in Android Studio and install SDK Platform 34, or configure the SDK location locally. Do not commit machine-specific SDK paths. |
| Emulator cannot reach API | Confirm the service is listening on the host and use 10.0.2.2 rather than localhost from the emulator. |
| Physical device cannot reach API | Use a reachable host address or HTTPS tunnel and verify firewall and network rules. |
| Booth does not open | Confirm the booth URL is HTTPS, nonblank, reachable, and configured for the selected build variant. |
| App does not receive booth callback | Match the configured hostname and /booth/return path to the manifest filter; verify Android App Links and callback state. |
| Release build rejects configuration | Supply the three required himvote booth properties. Do not satisfy the check with the checked-in himvote.local examples for a real release. |
| Release TLS pinning fails | Confirm the exact requested host matches the configured CertificatePinner entries and review the current certificate chain and pins. |

## Pre-release review

Before any distribution beyond a controlled development demonstration:

1. Replace example API, casting, and booth hosts.
2. Replace and independently verify TLS pins; plan pin rotation.
3. Correct and verify the app-link return host and path.
4. Confirm API routing and authentication against the current server contract.
5. Review the app-wide cleartext policy and every network client.
6. Review KeyStore-backed encryption, backup exclusions, screen capture policy, clipboard behavior, and diagnostic logging.
7. Test supported Android versions, real devices, TalkBack, large font scales, and network failure modes.
8. Configure signing outside source control and verify the signed artifact.
9. Follow the repository's established-engine and independent-witness release gates.

## Related documentation

- [Repository overview and release status](../../README.md)
- [Android manifest](app/src/main/AndroidManifest.xml)
- [Android Gradle configuration](app/build.gradle.kts)
- [Network security configuration](app/src/main/res/xml/network_security_config.xml)
