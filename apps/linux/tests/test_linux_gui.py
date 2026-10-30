import os
from pathlib import Path

import pytest

from apps.linux.himvote_linux import HimVoteLinuxApp


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window smoke testing")
def test_linux_window_starts_and_closes() -> None:
    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.after(100, app.destroy)
    app.mainloop()
