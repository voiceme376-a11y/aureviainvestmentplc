# Aurevia direct-upload authentication

This build includes a root `_worker.js` advanced-mode adapter so the authentication API can run when the project is uploaded with Cloudflare Pages Direct Upload. Cloudflare documents that dashboard drag-and-drop does not compile a `/functions` directory, while a root `_worker.js` is supported for Direct Upload.

## Cloudflare setup

1. Upload the ZIP's contents using Pages Direct Upload / drag-and-drop.
2. In **Settings → Bindings**, add a D1 database binding named exactly `DB` and select your Aurevia database.
3. Add encrypted secrets under **Settings → Variables and Secrets**:
   - `ADMIN_BOOTSTRAP_TOKEN`
   - `PAYSTACK_SECRET_KEY` (only when payments are enabled)
4. Redeploy after changing bindings/secrets.
5. Open the site root. The homepage calls `GET /api/auth/me` and shows Login/Create account when no valid session exists.

## Login/create-account behavior

- Create account writes a user, profile, NGN wallet and welcome notification to D1.
- Registration returns an HTTP-only `aurevia_session` cookie and redirects to the dashboard.
- Login verifies the password against the server-side hash, creates a seven-day session and redirects to the dashboard.
- Refreshing a page validates the HTTP-only session with `/api/auth/me`; browser local storage is only used for non-sensitive display state.
- Logout revokes the server session and clears the cookie before returning to the login screen.
- A missing/expired session always returns to authentication instead of rendering another user's data.

## Full backend deployment

For Git/Wrangler deployments, the original `/functions` directory is also present and can be deployed using Cloudflare's Pages Functions workflow. Do not commit live payment secrets to source control.
