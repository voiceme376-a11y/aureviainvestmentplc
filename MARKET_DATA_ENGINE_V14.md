# Aurevia v14 — Market Visualization Architecture

The 4D chart is a self-contained Aurevia canvas renderer. No proprietary chart website files are copied into the project.

### Data source

The price and candle values displayed by the user chart come from the Aurevia D1 `live_trades` and `live_trade_candles` records published by an authorized administrator.

### Visual layer

The renderer adds:

- perspective grid and depth lines;
- candlestick bodies and wicks from stored values;
- current-price guide line;
- animated scanner and energy field;
- layered candle extrusion for a 4D visual effect;
- responsive canvas sizing;
- continuous animation without inventing new market prices.

### External live markets

If Aurevia later connects an authorized exchange or market-data provider, its server-side feed can write normalized price/candle data into the same chart model. The browser should not receive provider secrets.
