# Aurevia Production Transaction Setup

This package contains the server-side workflow required to connect Aurevia to a configured payment/transfer provider. It is not a substitute for provider onboarding, legal authorization, KYC/AML procedures, risk controls or operational approval.

## 1. Cloudflare

1. Create a Cloudflare Pages project.
2. Deploy using Git integration or Wrangler because Pages Functions are required.
3. Create a D1 database named `aurevia-db`.
4. Set the database ID in `wrangler.toml`.
5. Apply migrations `0001` through `0004`.
6. Bind the database to Pages Functions as `DB`.

## 2. Secrets

Configure these as encrypted Cloudflare secrets:

- `PAYSTACK_SECRET_KEY`
- `ADMIN_BOOTSTRAP_TOKEN`

## 3. Payment endpoints

Aurevia uses:

- `POST /api/transactions/deposit`
- `GET /api/transactions/verify?reference=...`
- `POST /api/payments/paystack-webhook`
- `POST /api/account/beneficiary`
- `POST /api/transactions/withdraw`
- `PUT /api/admin/finance`
- `POST /api/payments/transfer-webhook`
- `POST /api/transactions/upgrade`

## 4. Provider configuration

Configure the provider dashboard to send payment and transfer events to the deployed HTTPS webhook URLs. The server verifies provider signatures before processing events.

## 5. Settlement rules

- A payment is not credited because a browser returned to Aurevia.
- A deposit is credited only after server-side provider confirmation.
- Ledger external references are unique for duplicate protection.
- A withdrawal locks funds before operations review.
- A provider transfer success reduces the wallet and creates a debit ledger entry.
- Failed/reversed transfers release the locked funds.
- Provider status is the authoritative settlement state.

## 6. Trade execution

Trading remains intentionally provider-dependent. Do not display invented fills or balances. To enable actual trading, integrate an authorized exchange/broker API with server-side credentials, order lifecycle tracking, risk limits and reconciliation.
