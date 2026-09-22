# Aurevia Investment PLC Platform

Aurevia is a Cloudflare-ready account, wallet, payments and operations platform with a 4D finance interface.

## Included

- Aurevia Investment PLC 3D metallic logo asset and brand system
- Seven-second 4D startup experience
- Home authentication experience with server-backed registration and login
- Logout that returns to the authentication/startup flow
- Dedicated pages with working Home navigation
- User profiles and personal-data management
- D1-backed wallet and transaction records
- Paystack payment initialization, verification and webhooks
- Nigerian bank-account verification and transfer recipients
- Withdrawal approval workflow with provider status webhooks
- Account upgrade payment workflow
- Server-side admin control center
- User, profile, wallet, beneficiary, transaction and audit inspection
- Password hashing and HttpOnly secure sessions
- PWA/offline static shell without caching private `/api/` responses
- Terms and privacy template pages

## Production deployment

Pages Functions require a Functions-compatible deployment route such as Git integration or Wrangler. Dashboard Direct Upload does not deploy Pages Functions.

Create a D1 database, bind it as `DB`, configure the provider secret, apply all migrations and deploy. See `CLOUDFLARE_DEPLOY.md`, `DEPLOY_BACKEND.md` and `REAL_TRANSACTION_SETUP.md`.

## Required secrets

- `PAYSTACK_SECRET_KEY`
- `ADMIN_BOOTSTRAP_TOKEN`

Keep both values server-side. Never place provider secret keys in frontend JavaScript.

## Financial workflow boundary

The platform does not fabricate balances, trades, quotes or customer accounts. New accounts begin with zero wallet balance and empty transaction history. Deposits and withdrawals become settled records only after the configured provider confirms them. Trade execution requires a separately authorized exchange/broker integration.

## Personal data

The profile model supports legal-name components, phone, date of birth, country, state, city, addresses, postal code, occupation, nationality, gender, tax residency, employer/business, source of funds, timezone and verification status. The platform does not scrape private personal information from random websites.
