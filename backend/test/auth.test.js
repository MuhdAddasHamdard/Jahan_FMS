import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  postJson,
  getJson,
  uniqueEmail,
  cleanupTestUsers,
  createTestUser,
} from "./helpers.js";
import prisma from "../src/prisma";
import { loginRateLimit } from "../src/routes/user.router";

let server;
let baseUrl;

before(async () => {
  ({ server, baseUrl } = await startServer());
});

after(async () => {
  loginRateLimit.resetKey("127.0.0.1");
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("POST /users blocks unauthenticated account creation", async () => {
  const email = uniqueEmail("register");

  const { status, data } = await postJson(baseUrl, "/users", {
    name: "Register Test",
    email,
    password: "password123",
    role: "ADMIN",
  });

  assert.equal(status, 401);
  assert.equal(data.message, "Authorization header is missing");
  assert.equal(await prisma.user.findUnique({ where: { email } }), null);
});

test("POST /users allows admins to create accounts and validates payloads", async () => {
  const adminEmail = uniqueEmail("account-admin");
  const admin = await createTestUser({
    name: "Account Admin",
    email: adminEmail,
    password: "password123",
    role: "ADMIN",
  });
  const login = await postJson(baseUrl, "/users/login", {
    email: adminEmail,
    password: "password123",
  });
  assert.equal(login.status, 200);

  const created = await postJson(
    baseUrl,
    "/users",
    {
      name: "Register Test",
      email: uniqueEmail("register"),
      password: "SecurePassword123",
    },
    login.data.token,
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.role, "STUDENT");
  assert.equal(created.data.password, undefined);

  const { status, data } = await postJson(
    baseUrl,
    "/users",
    {
      name: "X",
      email: "not-an-email",
      password: "short",
    },
    login.data.token,
  );

  assert.equal(status, 400);
  assert.ok(data.message);

  const member = await createTestUser({
    name: "Non-admin",
    email: uniqueEmail("non-admin"),
    password: "password123",
  });
  const memberLogin = await postJson(baseUrl, "/users/login", {
    email: member.data.email,
    password: "password123",
  });
  const forbidden = await postJson(
    baseUrl,
    "/users",
    {
      name: "Forbidden",
      email: uniqueEmail("forbidden"),
      password: "SecurePassword123",
    },
    memberLogin.data.token,
  );
  assert.equal(forbidden.status, 403);

  await prisma.user.deleteMany({
    where: { id: { in: [admin.data.id, created.data.id, member.data.id] } },
  });
});

test("POST /users/login returns a token and no password", async () => {
  const email = uniqueEmail("login");

  await createTestUser({
    name: "Login Test",
    email,
    password: "password123",
  });

  const { status, data } = await postJson(baseUrl, "/users/login", {
    email: email.toUpperCase(),
    password: "password123",
  });

  assert.equal(status, 200);
  assert.ok(data.token);
  assert.equal(data.user.email, email);
  assert.equal(data.user.password, undefined);
});

test("POST /users/login gives the same error for unknown and incorrect credentials", async () => {
  const email = uniqueEmail("wrong-password");
  await createTestUser({
    name: "Wrong Password Test",
    email,
    password: "password123",
  });

  const unknown = await postJson(baseUrl, "/users/login", {
    email: uniqueEmail("nobody"),
    password: "wrongpassword",
  });
  const incorrect = await postJson(baseUrl, "/users/login", {
    email,
    password: "wrongpassword",
  });

  assert.equal(unknown.status, 401);
  assert.equal(incorrect.status, 401);
  assert.equal(unknown.data.message, incorrect.data.message);
});

test("GET /users/me returns the authenticated user", async () => {
  const email = uniqueEmail("me");

  const reg = await createTestUser({
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
  const admin = await createTestUser({
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
  const employee = await createTestUser({
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

test("API responses include security headers and do not allow unknown origins", async () => {
  const response = await fetch(`${baseUrl}/`, {
    headers: { Origin: "https://untrusted.example" },
  });

  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.ok(response.headers.get("content-security-policy"));
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("POST /users/login rate-limits repeated failed attempts", async () => {
  loginRateLimit.resetKey("127.0.0.1");
  let response;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    response = await postJson(baseUrl, "/users/login", {
      email: uniqueEmail("rate-limit"),
      password: "wrongpassword",
    });
    assert.equal(response.status, 401);
  }

  response = await postJson(baseUrl, "/users/login", {
    email: uniqueEmail("rate-limit"),
    password: "wrongpassword",
  });
  assert.equal(response.status, 429);
});