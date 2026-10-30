# Platform test matrix

## Web

Commands:

```text
npm run typecheck
npm test
npm run build
python tests/browser_smoke.py
```

Status: PASS locally. Browser smoke covers desktop and mobile viewport behavior, receipt progression, and responsive navigation.

## Linux desktop

Commands:

```text
python3 -m pytest apps/linux/tests -q
xvfb-run -a python3 -m pytest apps/linux/tests -q
python3 apps/linux/himvote_linux.py
```

Status: PASS locally. Seven client checks pass, including a Tk window startup and close smoke test under Xvfb.

## Android

Command:

```text
./gradlew test
```

Status: PASS locally. `./gradlew test` completed successfully after fixing Compose layout imports and opting into the Material 3 tab API. Instrumented device tests still require an Android device or emulator runner.

## iOS

Command:

```text
swift test
```

Status: BLOCKED locally. Swift and Xcode are not installed in this environment. Run unit and UI tests on a macOS runner before claiming iOS delivery.

## Windows desktop

Command:

```text
dotnet test apps/desktop/HimVote.Windows.sln
```

Status: BLOCKED locally. The .NET SDK is not installed in this environment. Run on a Windows runner before claiming desktop delivery.

## Shared protocol and service tests

Commands:

```text
python3 tests/run_tests.py
```

Status: PASS for the root protocol suite and each service suite when executed from its service directory. The root protocol suite reports 12 passing tests. Service suites report 20, 19, 22, and 34 passing tests respectively.

No platform is marked delivered until its native build and test command passes on the required runner.
