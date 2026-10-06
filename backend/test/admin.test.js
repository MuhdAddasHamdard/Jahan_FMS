import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  postJson,
  getJson,
  uniqueEmail,
  between,
  cleanupTestUsers,
} from "./helpers.js";
import prisma from "../src/prisma";

let server;
let baseUrl;
let adminToken;
let adminId;
let adminEmail;
let employeeToken;
let employeeEmail;

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

  const admin = await postJson(baseUrl, "/users", {
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

  const employee = await postJson(baseUrl, "/users", {
    name: "Lowly Employee",
    email: uniqueEmail("admin-emp"),
    password: "password123",
  });
  employeeEmail = employee.data.email;

  const employeeLogin = await postJson(baseUrl, "/users/login", {
    email: employeeEmail,
    password: "password123",
  });
  employeeToken = employeeLogin.data.token;
});

after(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [adminId] } },
  });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("PATCH /users/:id/role with ADMIN updates the role", async () => {
  const target = await postJson(baseUrl, "/users", {
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
  const target = await postJson(baseUrl, "/users", {
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
  const target = await postJson(baseUrl, "/users", {
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

test("DELETE /users/:id with ADMIN deletes the user", async () => {
  const target = await postJson(baseUrl, "/users", {
    name: "Doomed",
    email: uniqueEmail("doomed"),
    password: "password123",
  });

  const { status } = await deleteJson(`/users/${target.data.id}`, adminToken);
  assert.equal(status, 204);

  const gone = await prisma.user.findUnique({ where: { id: target.data.id } });
  assert.equal(gone, null);
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

test("DELETE /users/:id cascades to institute data", async () => {
  const target = await postJson(baseUrl, "/users", {
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

  const cls = await postJson(baseUrl, "/classes", { name: "Cascade Class" }, targetToken);
  const student = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Cascade Student", classId: cls.data.id },
    targetToken,
  );
  await postJson(baseUrl, "/fees/types", { name: "Cascade Fee", amount: 1000 }, targetToken);
  await postJson(
    baseUrl,
    "/expenses",
    { description: "Cascade expense", amount: 500 },
    targetToken,
  );

  const { status } = await deleteJson(`/users/${target.data.id}`, adminToken);
  assert.equal(status, 204);

  const orphanStudents = await prisma.student.count({ where: { userId: target.data.id } });
  assert.equal(orphanStudents, 0);
  const orphanClasses = await prisma.class.count({ where: { userId: target.data.id } });
  assert.equal(orphanClasses, 0);
  const orphanExpenses = await prisma.expense.count({ where: { userId: target.data.id } });
  assert.equal(orphanExpenses, 0);
});