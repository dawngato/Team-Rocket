"""Browser smoke checks for public and student-safe verification paths.

Run with the repository's server wrapper:

    python /home/Kali/.codex/skills/webapp-testing/scripts/with_server.py \
      --server "npm run dev" --port 3000 -- python tests/browser_smoke.py

The smoke test never submits a ballot and does not treat UI status copy as
proof of an election security property.
"""

import os
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("HIMVOTE_WEB_URL", "http://127.0.0.1:3000").rstrip("/")
SCREENSHOT_PATH = os.environ.get("HIMVOTE_SCREENSHOT", "/tmp/himvote-home.png")


def goto_ready(page: Page, path: str) -> None:
    response = None
    for attempt in range(3):
        try:
            response = page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=60_000)
        except Exception:
            if attempt == 2:
                raise
            page.wait_for_timeout(1_000)
            continue
        if response is not None and response.ok:
            break
        if attempt < 2:
            page.wait_for_timeout(1_000)
    assert response is not None and response.ok, f"Route failed: {path} ({response})"
    page.locator("main#main-content").wait_for(state="visible")
    # Use a DOM wait instead of string-evaluated JavaScript so the smoke test
    # also works against the production CSP, which correctly blocks eval.
    page.locator("head link[rel='stylesheet'], head style").first.wait_for(state="attached")
    page.wait_for_load_state("networkidle", timeout=30_000)
    page.wait_for_timeout(1_000)


def assert_no_horizontal_overflow(page: Page) -> None:
    assert page.evaluate("document.body.scrollWidth <= window.innerWidth + 1")


def run_smoke() -> None:
    browser_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        # Cold Next.js development builds can compile a route on first request.
        page.set_default_timeout(30_000)
        page.on(
            "console",
            lambda message: browser_errors.append(
                f"console {message.type}: {message.text}"
            )
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: browser_errors.append(f"pageerror: {error}"))

        goto_ready(page, "/")
        Path(SCREENSHOT_PATH).parent.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=SCREENSHOT_PATH, full_page=True)
        assert page.get_by_text("Educational prototype.", exact=True).is_visible()
        assert page.get_by_role(
            "heading", name="Institutional voting, made verifiable.", exact=False
        ).is_visible()
        assert page.get_by_text("Voter Inclusion Check").is_visible()
        assert page.get_by_role("heading", name="Institutional Elections").is_visible()
        assert page.get_by_role(
            "heading", name="See how a record moves toward review"
        ).is_visible()
        assert page.get_by_text("Evidence observatory").is_visible()
        assert page.get_by_test_id("ballot-box-hero").is_visible()
        assert page.get_by_text("Decorative only.").is_visible()
        # Production public navigation contains no client-side role chooser.
        # Privileged navigation is rendered only after the server-authoritative
        # identity session is confirmed.
        assert page.locator("text=Navigation preview only").count() == 0
        assert page.locator("a[href='/admin']").count() == 0
        assert_no_horizontal_overflow(page)

        reduced_motion_page = browser.new_page(viewport={"width": 1440, "height": 900})
        reduced_motion_page.emulate_media(reduced_motion="reduce")
        goto_ready(reduced_motion_page, "/")
        reduced_motion_page.locator(".ballot-box-paper").wait_for(state="visible")
        assert reduced_motion_page.locator(".ballot-box-paper").evaluate(
            "node => getComputedStyle(node).animationName === 'none'"
        )
        assert reduced_motion_page.locator(".ballot-box-scene").evaluate(
            "node => getComputedStyle(node).transform === 'none'"
        )
        reduced_motion_page.close()

        # Mobile navigation remains reachable without leaving the already compiled route.
        page.set_viewport_size({"width": 390, "height": 844})
        page.locator("button.sv-public-menu").click()
        page.locator("nav.sv-public-nav.is-open").wait_for(state="visible")
        assert page.get_by_role("link", name="Security limits", exact=True).is_visible()
        assert page.get_by_role("link", name="Sign in", exact=True).is_visible()
        assert_no_horizontal_overflow(page)
        page.locator("button.sv-public-menu").click()
        page.set_viewport_size({"width": 1440, "height": 900})

        goto_ready(page, "/how-it-works")
        assert page.get_by_role("heading", name="How HimVote Verification Works").is_visible()
        stage_three = page.get_by_role("button", name="Stage 3", exact=False)
        page.wait_for_timeout(1_500)
        stage_three.evaluate("node => node.click()")
        page.get_by_role(
            "heading", name="Witnessed Merkle Tree Checkpoints"
        ).wait_for(state="visible")
        page.get_by_text("Independent witness operation is not present locally.").wait_for(state="visible")

        # Protected voting routes stay behind the identity gate. A guest must
        # not receive fixture ballots, election records, or a cast form.
        goto_ready(page, "/student/elections/elec_su_2026/cast")
        page.get_by_role("heading", name="Identity service unavailable").wait_for(state="visible")

        # Inclusion is also protected; the receipt handle must never be
        # resolved for an unauthenticated browser session.
        goto_ready(page, "/student/receipts/HV_24F8_19C2/inclusion")
        page.get_by_role("heading", name="Identity service unavailable").wait_for(state="visible")

        # Officer operational views also fail closed instead of rendering
        # local election fixtures when the identity service is absent.
        goto_ready(page, "/officer")
        page.get_by_role("heading", name="Identity service unavailable").wait_for(state="visible")
        goto_ready(page, "/officer/elections")
        page.get_by_role("heading", name="Identity service unavailable").wait_for(state="visible")

        browser.close()

    assert not browser_errors, "Browser reported errors:\n" + "\n".join(browser_errors)


if __name__ == "__main__":
    run_smoke()
