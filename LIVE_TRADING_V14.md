# Aurevia v14 — Live Trade Engine

v14 adds a self-contained administrator-controlled trade monitoring engine. It is written locally for Aurevia and does not depend on copied proprietary website files.

## Server workflow

1. Administrator creates a trade from `/admin/`.
2. The trade is stored in D1 in `live_trades`.
3. A first candle is stored in `live_trade_candles`.
4. Each administrator price update appends or updates a 15-second candle bucket.
5. Each update is written to `live_trade_updates` and the existing Aurevia audit log.
6. Users can read only trades assigned to their user ID or trades published to all accounts.
7. The user dashboard, Trade History and Markets pages poll the server feed every 3 seconds.
8. The 4D canvas continuously animates perspective, scanner and depth effects without fabricating extra price points.

## Important boundary

The chart is a monitoring visualization. It does not execute orders, create brokerage positions, or move wallet funds. Actual exchange/broker execution requires an authorized provider integration and server-side credentials.

## Migration

Apply the new migration after v13:

```bash
wrangler d1 migrations apply aurevia-db --remote
```

This creates `live_trade_updates` for a server-side change history.
