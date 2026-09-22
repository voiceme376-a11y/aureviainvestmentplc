# Aurevia v9 refresh/session behavior

- Refresh does **not** call `GET /api/auth/me`.
- Refresh keeps the existing route and restores the saved scroll position for that route.
- The locally persisted account display state keeps the dashboard visible after refresh.
- Protected API operations remain server-authoritative when the user performs an action.
- Only explicit **Logout** calls `POST /api/auth/logout`, clears the local session, removes the boot-session flag, and redirects to the Login/Create Account homepage.
- The responsive CSS prevents horizontal overflow and allows tables/forms/cards to shrink or scroll safely within the device viewport.
