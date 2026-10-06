import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, postJson, getJson, uniqueEmail, cleanupTestUsers } from "./helpers.js";
import prisma from "../src/prisma";

let server;
let baseUrl;

before(async () => {
  ({ server, baseUrl } = await startServer());
});

after(async () => {
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("POST /users registers a user and ignores a client-provided role", async () => {
  const email = uniqueEmail("register");

  const { status, data } = await postJson(baseUrl, "/users", {
    name: "Register Test",
    email,
    password: "password123",
    role: "ADMIN",
  });

  assert.equal(status, 201);
  assert.equal(data.role, "STUDENT");
  assert.equal(data.name, "Register Test");
  assert.equal(data.email, email);
  assert.ok(data.id);
  assert.equal(data.password, undefined);

  await prisma.user.delete({ where: { id: data.id } });
});

test("POST /users rejects invalid payloads with 400", async () => {
  let { status, data } = await postJson(baseUrl, "/users", {
    name: "X",
    email: "not-an-email",
    password: "short",
  });

  assert.equal(status, 400);
  assert.ok(data.message);
});

test("POST /users/login returns a token and no password", async () => {
  const email = uniqueEmail("login");

  await postJson(baseUrl, "/users", {
    name: "Login Test",
    email,
    password: "password123",
  });

  const { status, data } = await postJson(baseUrl, "/users/login", {
    email,
    password: "password123",
  });

  assert.equal(status, 200);
  assert.ok(data.token);
  assert.equal(data.user.email, email);
  assert.equal(data.user.password, undefined);
});

test("POST /users/login rejects bad credentials with 401", async () => {
  const { status } = await postJson(baseUrl, "/users/login", {
    email: uniqueEmail("nobody"),
    password: "wrongpassword",
  });

  assert.equal(status, 401);
});

test("GET /users/me returns the authenticated user", async () => {
  const email = uniqueEmail("me");

  const reg = await postJson(baseUrl, "/users", {
    name: "Me Test",
    email,
    password: "password123",
  });

  const login = await postJson(baseUrl, "/users/login", {
    email,
    password: "password123",
  });

  const { status, data } = await getJson(baseUrl, "/users/me", login.data.token);

  assert.equal(status, 200);
  assert.equal(data.user.id, reg.data.id);
  assert.equal(data.user.email, email);

  await prisma.user.delete({ where: { id: reg.data.id } });
});

test("GET /users requires an authenticated ADMIN", async () => {
  const adminEmail = uniqueEmail("admin");
  const admin = await postJson(baseUrl, "/users", {
    name: "Admin Test",
    email: adminEmail,
    password: "password123",
  });

  await prisma.user.update({
    where: { id: admin.data.id },
    data: { role: "ADMIN" },
  });

  const adminLogin = await postJson(baseUrl, "/users/login", {
    email: adminEmail,
    password: "password123",
  });

  const employeeEmail = uniqueEmail("emp");
  const employee = await postJson(baseUrl, "/users", {
    name: "Employee Test",
    email: employeeEmail,
    password: "password123",
  });

  const employeeLogin = await postJson(baseUrl, "/users/login", {
    email: employeeEmail,
    password: "password123",
  });

  const { status: adminStatus, data: adminData } = await getJson(
    baseUrl,
    "/users",
    adminLogin.data.token,
  );
  assert.equal(adminStatus, 200);
  assert.ok(Array.isArray(adminData));

  const forbidden = await getJson(baseUrl, "/users", employeeLogin.data.token);
  assert.equal(forbidden.status, 403);

  const unauthorized = await getJson(baseUrl, "/users", undefined);
  assert.equal(unauthorized.status, 401);

  await prisma.user.deleteMany({
    where: { id: { in: [admin.data.id, employee.data.id] } },
  });
});