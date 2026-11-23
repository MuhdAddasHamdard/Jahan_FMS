import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/prisma";
import { createTestUser, postJson, startServer, uniqueEmail } from "./helpers.js";

const device = randomUUID();
let server, baseUrl, token, actorId;

before(async () => {
  ({ server, baseUrl } = await startServer());
  const credentials = { email: uniqueEmail("offline-sync"), password: "Sync-Testing-123!" };
  const user = await createTestUser({ ...credentials, name: "Offline test" });
  actorId = user.data.id;
  await prisma.user.update({ where: { id: actorId }, data: { role: "FINANCE" } });
  const login = await postJson(baseUrl, "/users/login", credentials);
  assert.equal(login.status, 200);
  token = login.data.token;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (actorId) {
    await prisma.syncMutation.deleteMany({ where: { actorId } });
    await prisma.user.delete({ where: { id: actorId } });
  }
});

const request = (path, { method = "GET", body, key, revision, fromDevice = device } = {}) => {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  if (key) Object.assign(headers, { "X-Sync-Operation": key, "X-Sync-Device": fromDevice });
  if (revision !== undefined) headers["X-Sync-Revision"] = revision;
  return fetch(`${baseUrl}${path}`, { method, headers, body: JSON.stringify(body) });
};

test("simultaneous submissions replay the same committed result, without creating duplicate expenses", async () => {
  const options = { method: "POST", key: randomUUID(), body: { description: "Offline electricity", amount: 100 } };
  const responses = await Promise.all([request("/expenses", options), request("/expenses", options)]);
  assert.deepEqual(responses.map((response) => response.status), [201, 201]);
  const [first, replay] = await Promise.all(responses.map((response) => response.json()));
  assert.deepEqual(first, replay);
  assert.equal(await prisma.expense.count({ where: { userId: actorId, description: options.body.description } }), 1);

  const reused = await request("/expenses", { ...options, body: { ...options.body, amount: 200 } });
  assert.equal(reused.status, 409);
});

test("a stale change is rejected after another device writes, while delete retries replay 204", async () => {
  const created = await request("/expenses", { method: "POST", body: { description: "Original", amount: 50 } });
  assert.equal(created.status, 201);
  const { id } = await created.json();
  const path = `/expenses/${id}`;
  const before = await request(path);
  const revision = before.headers.get("X-Sync-Revision");
  assert.match(revision, /^\d+$/);
  const updated = await request(path, {
    method: "PATCH", key: randomUUID(), fromDevice: randomUUID(), body: { description: "Updated elsewhere" },
  });
  assert.equal(updated.status, 200);

  const stale = await request(path, { method: "PATCH", key: randomUUID(), revision, body: { description: "Offline edit" } });
  assert.equal(stale.status, 409);
  const current = await request(path);
  assert.equal((await current.json()).description, "Updated elsewhere");
  const remove = { method: "DELETE", key: randomUUID(), revision: current.headers.get("X-Sync-Revision") };
  assert.equal((await request(path, remove)).status, 204);
  assert.equal((await request(path, remove)).status, 204);
});
