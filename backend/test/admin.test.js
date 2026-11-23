import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  postJson,
  getJson,
  uniqueEmail,
  between,
  cleanupTestUsers,
  createTestUser,
} from "./helpers.js";
import prisma from "../src/prisma";

let server;
let baseUrl;
let adminToken;
let adminId;
let adminEmail;
let employeeToken;
let employeeEmail;
let employeeId;

const patchJson = async (path, body, token) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
};

const deleteJson = async (path, token) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
};

before(async () => {
  ({ server, baseUrl } = await startServer());

  const admin = await createTestUser({
    name: "Boss Admin",
    email: uniqueEmail("admin-boss"),
    password: "password123",
  });
  adminId = admin.data.id;
  adminEmail = admin.data.email;
  await prisma.user.update({
    where: { id: adminId },
    data: { role: "ADMIN" },
  });

  const adminLogin = await postJson(baseUrl, "/users/login", {
    email: adminEmail,
    password: "password123",
  });
  adminToken = adminLogin.data.token;

  const employee = await createTestUser({
    name: "Lowly Employee",
    email: uniqueEmail("admin-emp"),
    password: "password123",
  });
  employeeEmail = employee.data.email;
  employeeId = employee.data.id;

  const employeeLogin = await postJson(baseUrl, "/users/login", {
    email: employeeEmail,
    password: "password123",
  });
  employeeToken = employeeLogin.data.token;
});

after(async () => {
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("PATCH /users/:id/role with ADMIN updates the role", async () => {
  const target = await createTestUser({
    name: "Promotable",
    email: uniqueEmail("promotable"),
    password: "password123",
  });
  assert.equal(target.data.role, "STUDENT");

  const { status, data } = await patchJson(
    `/users/${target.data.id}/role`,
    { role: "ADMIN" },
    adminToken,
  );

  assert.equal(status, 200);
  assert.equal(data.role, "ADMIN");

  await prisma.user.delete({ where: { id: target.data.id } });
});

test("PATCH /users/:id/role rejects invalid roles", async () => {
  const target = await createTestUser({
    name: "A",
    email: uniqueEmail("bad-role"),
    password: "password123",
  });

  const { status } = await patchJson(
    `/users/${target.data.id}/role`,
    { role: "SUPERUSER" },
    adminToken,
  );
  assert.equal(status, 400);

  await prisma.user.delete({ where: { id: target.data.id } });
});

test("PATCH /users/:id/role is forbidden for non-admin users", async () => {
  const target = await createTestUser({
    name: "B",
    email: uniqueEmail("role-emp"),
    password: "password123",
  });

  const { status } = await patchJson(
    `/users/${target.data.id}/role`,
    { role: "ADMIN" },
    employeeToken,
  );
  assert.equal(status, 403);

  await prisma.user.delete({ where: { id: target.data.id } });
});

test("PATCH /users/:id/permissions lets admins grant and revoke module access", async () => {
  const granted = await patchJson(
    `/users/${employeeId}/permissions`,
    { permissions: ["CLASSES"] },
    adminToken,
  );
  assert.equal(granted.status, 200);
  assert.deepEqual(granted.data.permissions, ["CLASSES"]);

  const classAccess = await getJson(baseUrl, "/classes", employeeToken);
  assert.equal(classAccess.status, 200);

  const revoked = await patchJson(
    `/users/${employeeId}/permissions`,
    { permissions: [] },
    adminToken,
  );
  assert.equal(revoked.status, 200);
  assert.deepEqual(revoked.data.permissions, []);

  const denied = await getJson(baseUrl, "/classes", employeeToken);
  assert.equal(denied.status, 403);
});

test("PATCH /users/:id/permissions is admin-only and validates permission names", async () => {
  const forbidden = await patchJson(
    `/users/${employeeId}/permissions`,
    { permissions: ["CLASSES"] },
    employeeToken,
  );
  assert.equal(forbidden.status, 403);

  const invalid = await patchJson(
    `/users/${employeeId}/permissions`,
    { permissions: ["ROOT_ACCESS"] },
    adminToken,
  );
  assert.equal(invalid.status, 400);
});

test("PATCH /users/:id/permissions does not change administrator access", async () => {
  const { status, data } = await patchJson(
    `/users/${adminId}/permissions`,
    { permissions: [] },
    adminToken,
  );
  assert.equal(status, 400);
  assert.match(data.message, /ADMIN role/);
});

test("legacy DELETE /users/:id deactivates the account", async () => {
  const target = await createTestUser({
    name: "Doomed",
    email: uniqueEmail("doomed"),
    password: "password123",
  });

  const { status } = await deleteJson(`/users/${target.data.id}`, adminToken);
  assert.equal(status, 204);

  const account = await prisma.user.findUnique({ where: { id: target.data.id } });
  assert.ok(account.deactivatedAt);
});

test("DELETE /users/:id cannot delete your own account", async () => {
  const { status } = await deleteJson(`/users/${adminId}`, adminToken);
  assert.equal(status, 400);
});

test("GET /users lists all users for the ADMIN", async () => {
  const { status, data } = await getJson(baseUrl, "/users", adminToken);
  assert.equal(status, 200);
  assert.ok(data.some((user) => user.email === employeeEmail));
  assert.ok(data.every((user) => user.password === undefined));
});

test("deactivation preserves institute records and invalidates old sessions", async () => {
  const target = await createTestUser({
    name: "Cascade",
    email: uniqueEmail("cascade"),
    password: "password123",
  });
  await prisma.user.update({
    where: { id: target.data.id },
    data: { role: "FINANCE" },
  });
  const targetLogin = await postJson(baseUrl, "/users/login", {
    email: target.data.email,
    password: "password123",
  });
  const targetToken = targetLogin.data.token;

  const teacher = await createTestUser({
    name: "Cascade Teacher",
    email: uniqueEmail("cascade-teacher"),
    password: "password123",
  });
  await prisma.user.update({
    where: { id: teacher.data.id },
    data: { role: "TEACHER" },
  });

  const cls = await postJson(
    baseUrl,
    "/classes",
    { name: "Cascade Class", teacherId: teacher.data.id },
    targetToken,
  );
  assert.equal(cls.status, 201);
  const student = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Cascade Student", classId: cls.data.id },
    targetToken,
  );
  const feeType = await postJson(baseUrl, "/fees/types", { name: "Cascade Fee", amount: 1000 }, targetToken);
  const plan = await postJson(baseUrl, "/fees/plans", { studentId: student.data.id, feeTypeId: feeType.data.id }, targetToken);
  assert.equal(plan.status, 201);
  const detail = await getJson(baseUrl, `/fees/plans/${plan.data.id}`, targetToken);
  const receipt = await postJson(baseUrl, "/fees/payments", { installmentId: detail.data.installments[0].id, amount: 500 }, targetToken);
  assert.equal(receipt.status, 201);
  const expense = await postJson(
    baseUrl,
    "/expenses",
    { description: "Cascade expense", amount: 500 },
    targetToken,
  );
  assert.equal(expense.status, 201);
  const staff = await postJson(baseUrl, "/staff", { staffNo: "RETAIN-1", name: "Retained Staff" }, targetToken);
  const payroll = await postJson(baseUrl, "/salaries/payments", { staffId: staff.data.id, periodMonth: "2026-11", amount: 300 }, targetToken);
  assert.equal(payroll.status, 201);

  const id = target.data.id;
  const disabled = await patchJson(`/users/${id}/status`, { active: false }, adminToken);
  assert.equal(disabled.status, 200);
  assert.ok(disabled.data.deactivatedAt);
  assert.equal((await getJson(baseUrl, "/users/me", targetToken)).status, 401);
  const credentials = { email: target.data.email, password: "password123" };
  assert.equal((await postJson(baseUrl, "/users/login", credentials)).status, 401);
  assert.equal((await prisma.receipt.findUnique({ where: { id: receipt.data.receipt.id } })).userId, id);
  assert.equal((await prisma.expense.findUnique({ where: { id: expense.data.id } })).userId, id);
  assert.equal((await prisma.salaryPayment.findUnique({ where: { id: payroll.data.id } })).userId, id);
  await assert.rejects(prisma.user.delete({ where: { id } }), /foreign key/i);

  const enabled = await patchJson(`/users/${id}/status`, { active: true }, adminToken);
  assert.equal(enabled.status, 200);
  assert.equal(enabled.data.deactivatedAt, null);
  assert.equal((await getJson(baseUrl, "/users/me", targetToken)).status, 401);
  assert.equal((await postJson(baseUrl, "/users/login", credentials)).status, 200);
});

test("administrator password resets revoke every previous session", async () => {
  const credentials = { email: uniqueEmail("reset-session"), password: "Old-password-123!" };
  const target = await createTestUser({ ...credentials, name: "Reset Session" });
  const first = await postJson(baseUrl, "/users/login", credentials);
  const second = await postJson(baseUrl, "/users/login", credentials);
  assert.notEqual(first.data.token, second.data.token);
  const password = "New-password-987!";
  assert.equal((await patchJson(`/users/${target.data.id}`, { password }, adminToken)).status, 200);
  for (const { data } of [first, second]) {
    assert.equal((await getJson(baseUrl, "/users/me", data.token)).status, 401);
  }
  const next = await postJson(baseUrl, "/users/login", { email: credentials.email, password });
  assert.equal(next.status, 200);
  assert.equal((await getJson(baseUrl, "/users/me", next.data.token)).status, 200);
});

test("the last active administrator cannot give up the administrator role", async () => {
  const result = await patchJson(`/users/${adminId}/role`, { role: "FINANCE" }, adminToken);
  assert.equal(result.status, 409);
});
