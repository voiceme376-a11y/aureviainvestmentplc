# Aurevia Investment PLC — v14

This package is a self-contained Aurevia implementation. It does not require copying proprietary files from another investment website.

## Added in v14
- Server-side administrator live trade publishing and assignment.
- Live trade update audit history.
- 15-second server candle buckets from administrator price updates.
- Continuous Aurevia 4D canvas market visualization with perspective/depth effects.
- User dashboard live-trade monitor.
- Trade History and Markets live feeds.
- Mobile-safe trade controls and responsive chart sizing.

## Deploy
1. Apply all D1 migrations:

```bash
wrangler d1 migrations apply aurevia-db --remote
```

2. Bind the D1 database to the Pages project as `DB`.
3. Redeploy the v14 package.
4. Sign in as an authorized administrator and open `/admin/`.
5. Publish a trade to one registered account or all active accounts.

## Important
The live trade engine is a server-controlled monitoring feed. It does not claim to execute brokerage/exchange orders or move customer funds. A real external market feed or broker execution provider can be connected server-side later without exposing provider credentials to the browser.
