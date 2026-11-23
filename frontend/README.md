# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# Offline access

Sign in online on the browser and device you plan to use offline. The production
build downloads the app and the main lists your account can access. Open any
record details or reports you’ll need while online to download them too. Offline
reports show the last downloaded results for the same filters.

You can submit student, class, staff, fee, refund, salary, expense and institute
profile changes offline. The **Saved changes** panel shows what is stored in this
browser. New records get their database IDs and official receipts or vouchers
after sync, so changes that depend on those records can follow once they sync.
User accounts, access settings and passwords require a connection.

Keep the app open or reopen it on the same browser to sync. If your session has
expired, sign in again with the same account. The server checks each submission
for permissions, validity and changes from other devices. When a change needs
review, open its saved details, check the latest records and re-enter the change.
Use **Refresh records** after sync to load the updated details on the current page.

Downloaded institute records and pending changes are stored in the browser
profile. Use a trusted device and avoid clearing site data while changes are
pending. Signing out clears downloaded records for the signed-out account and
keeps its pending submissions available after signing in again.

Administrators can limit downloads to approved browsers and choose a retention
window in **Settings → Offline access**. Changes to the policy are picked up
when a browser reconnects. Revoking download access clears downloaded records
and preserves the pending submissions for the same account to sync online.

Host the production build over HTTPS (localhost works for testing). Serve
`service-worker.js` and the generated assets from the frontend origin and
configure navigation routes to serve `index.html`. Deploy the backend migration
and updated API before publishing the frontend build.
