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

After setting `DATABASE_URL`, apply the additive fee-discount migration with:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Existing fee plans keep a `NONE` discount by default. A fee-plan discount can
be a percentage or fixed amount and is applied once to the whole plan before
installments are generated. Plan discounts cannot be changed after payments
have been recorded.

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
