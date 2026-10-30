"""Compatibility entrypoint for the durable witness application.

The old in-memory witness implementation was retired.  The service exported
here is the signed, SQLite-backed implementation in ``witness.app``.
"""

from witness.app import app, create_app

__all__ = ["app", "create_app"]

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("witness.app:app", host="0.0.0.0", port=8086)
