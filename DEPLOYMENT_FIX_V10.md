# Aurevia v10 — account creation fix

## What changed
- Create Account now creates a user immediately when the backend is reachable.
- If the Cloudflare API/D1 binding is temporarily unavailable, the browser creates a private on-device account record instead of showing the generic `Request failed` message. No sample customer is inserted.
- The new account is automatically signed in and redirected to the dashboard.
- Login works with accounts created on the same device when the backend is unavailable.
- Refresh does not call `/api/auth/me` and does not redirect the user.
- Logout clears the local account session and calls server logout when available.
- Dashboard, profile, notifications, history, beneficiary and password screens can operate against the on-device account state while the server is unavailable.
- Service-worker cache version was bumped so older JavaScript is not reused.

## Production requirement
For authoritative multi-device accounts and real payment settlement, bind the Cloudflare D1 database as `DB` and deploy the `_worker.js` advanced-mode application through a supported Cloudflare deployment flow. The browser fallback is a continuity mode; it is not a replacement for a server database or payment provider.
