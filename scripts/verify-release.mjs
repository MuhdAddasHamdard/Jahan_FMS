import assert from "node:assert/strict";

const [frontend, api, expected] = process.argv.slice(2);
if (!frontend || !api || !/^[a-f\d]{40}$/i.test(expected ?? "")) {
  throw new Error("Usage: node scripts/verify-release.mjs FRONTEND_URL API_URL FULL_COMMIT_SHA");
}

const endpoint = (base, path) => new URL(path, base.endsWith("/") ? base : `${base}/`);
const manifest = async (url) => {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  assert.ok(response.ok, `${url.pathname} returned HTTP ${response.status}`);
  return response.json();
};

const [build, backend] = await Promise.all([
  manifest(endpoint(frontend, "version.json")),
  manifest(endpoint(api, "health/ready")),
]);
assert.equal(build.revision, expected, "The frontend is serving the wrong release");
assert.equal(backend.revision, expected, "The API is serving the wrong release");
assert.equal(backend.status, "ready", "The API is not ready");
console.log(`Frontend, API and database are ready at ${expected}.`);
