# The Love Application

## Local setup

Requirements:

- Node.js 20 or newer
- npm

1. Copy `.env.example` to `.env`.
2. Set `ADMIN_PASSWORD` to a long private password.
3. Set `SESSION_SECRET` to a random value of at least 32 characters.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

Admin login: `http://localhost:3000/admin/login.html`

## Configuration

- `ADMIN_PASSWORD`: password used to enter the private admin dashboard. Do not put it in frontend files.
- `SESSION_SECRET`: secret used to sign the server-side session. Generate a different random value for every deployment.
- `PORT`: optional HTTP port; defaults to `3000`.
- `NODE_ENV`: set to `production` only after HTTPS is configured.
- `TRUST_PROXY`: set to `1` only when the application is behind one trusted HTTPS reverse proxy.

Keep `.env` private. The SQLite database is stored in `data/applications.db`, excluded from source control and blocked from public HTTP access.

## Authentication and deployment notes

Admin authentication is server-side and uses an HTTP-only session cookie backed by SQLite. This setup is suitable for local use and a single-host deployment. Production hosting still requires HTTPS and a trusted reverse proxy configuration.

## Backup and recovery

Stop the server, create or verify a backup:

```powershell
npm.cmd run backup
```

Backups are written to the ignored `backups/` directory and verified with SQLite integrity checking.

To restore a backup while the server is stopped:

```powershell
npm.cmd run restore -- "backups\applications-example.db"
```

The restore procedure saves a safety copy of the current database before replacing it.
