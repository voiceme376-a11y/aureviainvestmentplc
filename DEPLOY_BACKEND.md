# Aurevia backend deployment

The ZIP now contains a Cloudflare Pages Functions + D1 backend for:

- account registration
- login
- logout
- current-session lookup
- admin user listing
- admin user status/plan/role updates
- audit logging
- secure PBKDF2 password hashing
- HttpOnly session cookies

## 1. Create D1

Create a Cloudflare D1 database named `aurevia-db` and copy its ID into `wrangler.toml`.

## 2. Apply migration

Use Wrangler with your Cloudflare account and run the migration in `migrations/0001_init.sql` against the database.

## 3. Deploy

Deploy this project through a Cloudflare Pages/Workers workflow that builds the `functions/` directory. Direct-uploading only static files does not execute Pages Functions.

## 4. Admin

For production, create the first admin through a controlled server-side provisioning process and do not hard-code administrator credentials in browser JavaScript.

The included admin API enforces `role='admin'` server-side.

## Financial boundary

The package intentionally does **not** contain real deposit, withdrawal, investment settlement, wallet transfer, or trading execution logic. Those are high-risk financial operations and require a properly licensed/regulated service, payment provider, custody controls, transaction monitoring, and additional security review.
