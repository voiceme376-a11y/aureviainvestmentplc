# Aurevia 4D feature map

- Dashboard: responsive 4D glass interface
- Market data: provider-backed; no fabricated quotes
- Portfolio: visual allocation
- Activity: account transactions loaded from D1
- Quick actions: local UI interactions
- Export: CSV of provider market data
- Appearance: localStorage preferences
- Command palette: keyboard navigation
- PWA: install/offline shell
- Admin: server-managed user/settings/account controls and audit export
- Security: static response headers

### Navigation and account updates
- Dedicated Markets page and navigation link.
- Persistent Home action on every authenticated content page.
- Login/Create Account/Logout flow with startup loader reset after logout.
- Cloudflare-backed profile update and password change endpoints.
- Server-backed profile/password updates; authentication is not silently downgraded to local storage.
