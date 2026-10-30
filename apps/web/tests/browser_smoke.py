import os

from playwright.sync_api import sync_playwright


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(os.environ.get("HIMVOTE_WEB_URL", "http://127.0.0.1:3000"), wait_until="networkidle")
    page.screenshot(path="/tmp/himvote-home.png", full_page=True)

    assert page.get_by_text("Educational prototype.", exact=True).is_visible()
    assert page.get_by_role("heading", name="Institutional voting, made verifiable.", exact=False).is_visible()
    assert page.get_by_text("Voter Inclusion Check").is_visible()
    assert page.get_by_role("heading", name="Institutional Elections").is_visible()
    assert page.get_by_role("heading", name="See how a record moves toward review").is_visible()
    assert page.get_by_text("Evidence observatory").is_visible()
    assert page.evaluate("document.body.scrollWidth <= window.innerWidth + 1")

    page.set_viewport_size({"width": 390, "height": 844})
    page.get_by_role("button", name="Open navigation menu").click()
    mobile_security_link = page.locator("a[href='/security-limits']").last
    assert mobile_security_link.is_visible()
    assert page.get_by_text("Evidence observatory").is_visible()
    assert page.evaluate("document.body.scrollWidth <= window.innerWidth + 1")
    browser.close()
