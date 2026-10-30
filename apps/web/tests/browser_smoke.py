from playwright.sync_api import sync_playwright


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://127.0.0.1:3100", wait_until="networkidle")
    page.screenshot(path="/tmp/himvote-home.png", full_page=True)

    assert page.get_by_role("heading", name="Confidence you can check.", exact=False).is_visible()
    assert page.get_by_text("PENDING_WITNESS").count() == 0
    assert page.get_by_text("Your receipt does not reveal your selection.").is_visible()

    page.locator(".timeline-step").nth(1).click()
    assert page.get_by_role("heading", name="Evidence is visible as it is confirmed").is_visible()

    page.set_viewport_size({"width": 390, "height": 844})
    page.get_by_role("button", name="Open navigation").click()
    assert page.get_by_role("navigation", name="Main navigation").get_by_role("link", name="Security limits").is_visible()
    browser.close()
