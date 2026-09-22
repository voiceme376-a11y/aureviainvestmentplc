# Admin setup

The admin UI is protected by the backend role check. To provision the first administrator:

1. Set a strong Cloudflare secret named `ADMIN_BOOTSTRAP_TOKEN`.
2. POST to `/api/admin/bootstrap` with:

```json
{
  "bootstrapToken": "YOUR_BOOTSTRAP_TOKEN",
  "name": "Aurevia Administrator",
  "email": "admin@your-domain.example",
  "password": "a-long-unique-password"
}
```

3. Log in through `/login.html` using that admin account.
4. Open `/admin/index.html`.

The backend checks the session's `role === 'admin'` for admin API calls. Never place the bootstrap token or admin password in browser code.
