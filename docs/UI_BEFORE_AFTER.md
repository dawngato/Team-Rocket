# UI before and after evidence

The current branch changes the public and authenticated presentation from the older Apple-style global navigation to an original HimVote workspace system.

## Captures

Generated from the production server with Playwright:

```bash
cd apps/web
npm run build
HIMVOTE_WEB_URL=http://127.0.0.1:3010 python3 /home/Kali/.agents/skills/webapp-testing/scripts/with_server.py \
  --server "npm run start -- -p 3010" --port 3010 -- \
  python -c 'from playwright.sync_api import sync_playwright; b=sync_playwright().start(); w=b.chromium.launch(); p=w.new_page(viewport={"width":1440,"height":900}); p.goto("http://127.0.0.1:3010/", wait_until="networkidle"); p.screenshot(path="/tmp/himvote-home.png", full_page=True); p.set_viewport_size({"width":390,"height":844}); p.screenshot(path="/tmp/himvote-mobile.png", full_page=True); w.close(); b.stop()'
```

Observed: public navigation is compact and responsive; the 3D ballot illustration is clearly labelled decorative; no seeded election cards are shown when the authoritative election API is not configured; protected routes render an identity gate instead of private fixtures.
