# Aurevia Cloudflare deployment — live workflow

## 1. Create the D1 database

Create `aurevia-db`, copy its database ID, and place that ID in `wrangler.toml` under the `DB` binding.

## 2. Apply migrations

Run:

```bash
npx wrangler d1 migrations apply aurevia-db --remote
```

This applies both the account tables and the finance/ledger migration.

## 3. Configure secrets

Set these as Cloudflare secrets:

```bash
npx wrangler pages secret put ADMIN_BOOTSTRAP_TOKEN
npx wrangler pages secret put PAYSTACK_SECRET_KEY
```

Never place the Paystack secret in frontend JavaScript.

## 4. Deploy

Use Git integration or Wrangler. Pages Functions are server-side and require a Functions-compatible deployment path.

```bash
npm install
npx wrangler pages deploy .
```

## 5. Configure provider webhooks

In the payment provider dashboard, set:

- `https://YOUR-DOMAIN/api/payments/paystack-webhook`
- `https://YOUR-DOMAIN/api/payments/transfer-webhook`

The server verifies the provider signature before accepting webhook events.

## 6. Bootstrap the first administrator

Use the bootstrap endpoint with the `ADMIN_BOOTSTRAP_TOKEN`, then sign in at `/login.html?next=admin`.

## 7. Test before live mode

Use provider test keys and test transactions first. Verify:

- account creation/login/logout
- profile save
- bank-account resolution
- deposit initialization
- provider confirmation/webhook
- duplicate webhook protection
- ledger credit
- withdrawal request locking
- admin approval/rejection
- transfer webhook success/reversal/failure
- wallet balance reconciliation

Only switch to live provider credentials after the business/provider onboarding and required compliance controls are complete.
