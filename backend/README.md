# Backend setup and security

## Required configuration

Set these variables in the backend environment. Keep real values in an ignored
`.env` file locally or in the hosting provider's secret manager; never commit
secrets.

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: random secret of at least 32 bytes. Generate one with
  `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
- `CORS_ORIGINS`: comma-separated, exact browser origins allowed to call the
  API, for example `http://localhost:5173` for local Vite development. Set the
  real HTTPS frontend origin in production. Do not include paths or wildcards.
- `TRUST_PROXY_HOPS`: number of trusted reverse-proxy hops; keep `0` unless the
  deployment is behind a proxy, and set it to the verified proxy-hop count when
  hosted.
- `PORT`: optional HTTP port; defaults to `5000`.

The API uses Helmet security headers, exact-origin CORS, 12-character minimum
passwords, admin-only account management, and a login limit of 10 failed
attempts per 15 minutes. The rate-limit counter is in process memory, so a
multi-instance deployment needs a shared rate-limit store. Successful
authenticated changes emit metadata-only audit events to standard output;
configure protected log retention with the hosting provider.

## Database migration

After setting `DATABASE_URL`, apply the migrations and regenerate the Prisma
client before starting the updated API:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Existing fee plans keep a `NONE` discount by default. A fee-plan discount can
be a percentage or fixed amount and is applied once to the whole plan before
installments are generated. Plan discounts cannot be changed after payments
have been recorded.

The offline sync migration adds `SyncMutation`. It stores the operation results
needed to replay retries without duplicating committed writes, and the revisions
used to detect stale offline edits. Keep this table with the other application
tables when backing up or restoring the database.

## Account and offline controls

- Deactivate departing accounts from **Users**. Institute records keep their
  original owner IDs, and the database prevents deleting an account that still
  owns records. An administrator can reactivate the account when needed.
- Password changes, administrator resets, and account deactivation revoke old
  sessions. The rollout also requires everyone to sign in again once to obtain
  a versioned session. A disconnected browser learns about revocation when it
  reconnects or its locally authorized window expires.
- In **Settings → Offline access**, administrators can approve individual
  registered browsers, disable downloads, and set a retention window of one to
  seven days. Existing installations start with all signed-in devices enabled.
  Pending changes remain on the device so the same user can upload them after
  signing in online. Use managed browser profiles for sensitive work.
- Offline writes detect conflicts against the actual records changed and any
  financial dependencies checked by the operation. Changes captured before the
  upgrade retain the older, conservative module check.

## Verify releases and restores

GitHub Actions runs the backend integration suite against an isolated PostgreSQL
database, checks frontend lint and build, verifies the running release, and
restores a sample backup into a separate database. For local integration tests,
use a migrated database with a separate `test` component in its name, such as
`jahan_test`. Tests remove their own fixtures.

Set `JAHAN_RELEASE_SHA` to the full Git commit SHA for both the frontend build
and the API process. Apply database migrations before starting the new API.
After deployment, check the actual frontend and API URLs:

```text
node scripts/verify-release.mjs FRONTEND_URL API_URL FULL_COMMIT_SHA
```

The API URL may include a proxy prefix such as `/api`. The check reads the
frontend release manifest and confirms the API can read the migrated database.

For a recovery drill, use an approved backup and restore it to a newly created,
isolated database. Use a PostgreSQL client compatible with the source server
and a preconfigured service name or credentials from the hosting provider:

```text
pg_dump --dbname=service=jahan_source --format=custom --file=jahan.dump
pg_restore --dbname=service=jahan_restore_test --exit-on-error --no-owner --no-privileges jahan.dump
```

Compare key totals and record counts with the backup snapshot, start a staging
API against the restored database, and record the backup age and time to restore.
Keep backup files outside source control and restrict access to them.
For a real recovery, rotate `JWT_SECRET` before reopening the restored API so
sessions issued after the backup can't come back into use. Reconcile financial
entries and pending offline work against the recovery point.

## Production checklist

- Use paid hosting suitable for real student and financial data, with managed
  PostgreSQL, TLS, automated backups, and a tested restore procedure.
- Rotate the existing admin password and any credentials used during
  development; use unique accounts and least-privilege permissions.
- Store secrets only in the provider's secret manager and configure the exact
  frontend origin and proxy hops.
- Enable provider MFA, restrict who can access production and backups, and set
  log retention/alerts. The application does not currently provide MFA or a
  durable database audit log.
- Apply migrations deliberately and verify backups before deploying changes.
