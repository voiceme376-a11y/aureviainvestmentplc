# Aurevia Platform Upgrade Notes

## Brand
- Added the Aurevia Investment PLC golden metallic 3D emblem to the site shell, authentication experience and startup loader.
- Removed placeholder initials and account-looking placeholder identities.

## Home and authentication
- Home now acts as the secure account gateway.
- Login and account creation are server-backed through Cloudflare Pages Functions.
- Registration captures name, email, phone and country, then creates an empty D1 wallet and profile.
- Authentication does not silently downgrade to browser-only accounts.

## Account data
- Expanded D1 profile model with nationality, gender, tax residency, employer/business and source-of-funds fields.
- Added server-backed personal-data editing.
- Added account terms and privacy template pages.

## Transactions
- Removed fabricated transaction figures and placeholder market quotes.
- Deposit actions create provider-backed payment references and redirect to the configured checkout.
- Provider confirmation/webhooks credit the wallet exactly once.
- Withdrawal requests lock funds, use verified beneficiaries and enter an authorized operations queue.
- Withdrawal requests now persist their provider reference so transfer webhooks can finalize the correct request.
- Account upgrades use the same server-side payment pattern.

## Admin control center
- User directory, profile data, wallet totals, beneficiaries, transaction history and audit events are server-backed.
- Withdrawal approval/rejection is server-authorized and audited.
- No pre-filled customer records are included.

## Data/security
- Service worker never caches `/api/` responses.
- Secure HttpOnly session cookies remain server-controlled.
- Provider secret keys remain server-side.
