import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cleanupTestUsers, createTestUser, postJson, startServer, uniqueEmail } from "./helpers.js";
import prisma from "../src/prisma";

let server, baseUrl, administrator, employee, memberId;
const deviceId = randomUUID();
const startUser = async (role) => {
  const credentials = { email: uniqueEmail("device-policy"), password: "Offline-Policy-123!" };
  const { data } = await createTestUser({ ...credentials, name: role, role });
  const login = await postJson(baseUrl, "/users/login", credentials);
  assert.equal(login.status, 200);
  return { id: data.id, token: login.data.token };
};

before(async () => {
  ({ server, baseUrl } = await startServer());
  administrator = (await startUser("ADMIN")).token;
  const member = await startUser("FINANCE");
  employee = member.token;
  memberId = member.id;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await prisma.instituteSettings.updateMany({ data: { offlineMode: "ALL_DEVICES", offlineMaxDays: 7 } });
  await cleanupTestUsers();
});

const request = (path, token, { method = "GET", body, device = deviceId } = {}) =>
  fetch(baseUrl + path, {
    method, body: JSON.stringify(body),
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "X-Offline-Device": device },
  });

test("offline policy can limit access by device and retention without blocking online work", async () => {
  const access = async (token, device) => (await (await request("/users/me", token, { device })).json()).offline;
  assert.deepEqual(await access(employee), { allowed: true, registered: false, maxDays: 7 });

  const policy = { method: "PATCH", body: { offlineMode: "TRUSTED_DEVICES", offlineMaxDays: 2 } };
  assert.equal((await request("/settings/offline", employee, policy)).status, 403);
  assert.equal((await request("/settings/offline", administrator, policy)).status, 200);
  assert.deepEqual(await access(employee), { allowed: false, registered: false, maxDays: 2 });

  const registration = { method: "POST", body: { deviceId, label: "Finance laptop" } };
  assert.equal((await request("/settings/offline/devices", employee, registration)).status, 204);
  assert.equal((await request("/settings/offline/devices", employee, registration)).status, 204);
  assert.deepEqual(await access(employee), { allowed: false, registered: true, maxDays: 2 });

  const listed = await (await request("/settings/offline", administrator)).json();
  assert.equal(listed.devices.filter((item) => item.deviceId === deviceId).length, 1);
  const path = "/settings/offline/devices/" + memberId + "/" + deviceId;
  const approval = { method: "PATCH", body: { trusted: true } };
  assert.equal((await request(path, employee, approval)).status, 403);
  assert.equal((await request(path, administrator, approval)).status, 204);
  assert.equal((await access(employee)).allowed, true);
  assert.equal((await access(employee, randomUUID())).allowed, false);
  assert.equal((await access(administrator, deviceId)).allowed, false);

  await request("/settings/offline", administrator, { method: "PATCH", body: { offlineMode: "DISABLED", offlineMaxDays: 2 } });
  assert.equal((await access(employee)).allowed, false);
  assert.equal((await request("/expenses", employee, {
    method: "POST", body: { description: "Online expense after disabling offline access", amount: 80 },
  })).status, 201);
});
