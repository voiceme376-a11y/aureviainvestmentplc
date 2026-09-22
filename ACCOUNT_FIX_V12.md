# Aurevia v12 — account creation fix

## What was fixed

The previous browser showed `Request failed` when the Cloudflare account API/D1 binding was unavailable. v12 changes the API adapter so an unavailable/HTML/5xx API response is treated as backend-unavailable and the account continuity path is used instead of showing the generic error.

The root `_worker.js` also returns a clear 503 JSON response when D1 is not bound to the deployment, while still serving all static assets through `env.ASSETS.fetch(request)`.

## Account creation flow

Create account → validate → create account record → create wallet/profile/notification records → persist the signed-in account state → open `index.html` dashboard.

When D1 is configured, the server/D1 path is used. When the deployment is not yet connected to D1, the browser continuity path is used so the UI remains usable on the same device. A browser-created account is not a substitute for a server account and cannot be shared across devices.

## Cloudflare production requirement

For cross-device server accounts, bind a D1 database to the Pages project using the binding name `DB`, then redeploy. Cloudflare documents D1 bindings under Pages Settings → Bindings and access through `context.env.DB`.
