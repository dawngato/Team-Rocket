# HimVote Linux client

The Linux client is a native Tkinter and ttk desktop application. It is separate from the Windows WinUI client in `apps/desktop`.

## Run locally

From the repository root:

```bash
python3 apps/linux/himvote_linux.py
```

To use a running API:

```bash
python3 apps/linux/himvote_linux.py --api-base http://localhost:8080
```

Without an API, the application starts in clearly labelled local demo mode. Demo mode never casts a ballot and never represents institutional data.

## Test

```bash
python3 -m pytest apps/linux/tests -q
```

For the window smoke test on a headless Linux machine:

```bash
xvfb-run -a python3 -m pytest apps/linux/tests -q
```

The Linux client supports election browsing, explicit evidence state labels, receipt status lookup, and offline verifier launch. It does not implement ballot encryption. Voting is handed off to the supported booth through the API contract.
