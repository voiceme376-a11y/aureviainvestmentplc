# Aurevia platform architecture

## Frontend

- 7-second 4D startup sequence on first open of a browser session
- Aurevia logo/4D visual treatment based on the supplied reference image
- Login + Create Account home screen
- Authenticated dashboard with the same visual language as the reference
- Dedicated direct URLs for every navigation item
- Each page keeps the same navigation and provides a path back to `index.html`
- Responsive sidebar matching the reference composition on mobile
- PWA/service-worker shell

## Backend

Cloudflare Pages Functions routes live under `functions/api/`.

- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/admin/users`
- `/api/admin/bootstrap`

D1 stores users, sessions and audit events. Passwords are PBKDF2-derived with a per-user salt. Sessions use random HttpOnly cookies.

## Financial safety boundary

The UI deliberately uses account balances, payments and withdrawals are loaded from the server ledger; external trade execution requires a configured execution provider.

A real financial deployment requires regulated providers, custody/payment integrations, transaction monitoring, fraud controls, reconciliation, authorization policies and independent security/compliance review.
