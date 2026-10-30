"""Compatibility entrypoint for the authoritative admin API package.

The implementation lives in ``src.main``.  Keeping this module as a narrow
re-export prevents an accidental launch of the retired duplicate API.
"""

from src.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=8083)
