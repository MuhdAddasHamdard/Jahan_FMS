import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  postJson,
  getJson,
  uniqueEmail,
  cleanupTestUsers,
} from "./helpers.js";
import prisma from "../src/prisma";

let server;
let baseUrl;
let token;
let userId;
let currentEmail;
let originalPassword = "password123";
let newPassword = "newpassword456";

const patchJson = async (path, body, authToken = token) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
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

before(async () => {
  ({ server, baseUrl } = await startServer());

  const registration = await postJson(baseUrl, "/users", {
    name: "Settings Admin",
    email: uniqueEmail("settings-user"),
    password: originalPassword,
  });
  userId = registration.data.id;
  currentEmail = registration.data.email;

  const login = await postJson(baseUrl, "/users/login", {
    email: registration.data.email,
    password: originalPassword,
  });
  token = login.data.token;
});

after(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("PATCH /users/me updates name, email and avatar", async () => {
  const newEmail = uniqueEmail("settings-renamed");
  const { status, data } = await patchJson("/users/me", {
    name: "Updated Name",
    email: newEmail,
    avatarUrl: "data:image/png;base64,AAAA",
  });

  assert.equal(status, 200);
  assert.equal(data.name, "Updated Name");
  assert.equal(data.email, newEmail);
  assert.equal(data.avatarUrl, "data:image/png;base64,AAAA");
  currentEmail = newEmail;
});

test("PATCH /users/me rejects invalid email", async () => {
  const { status } = await patchJson("/users/me", { email: "not-an-email" });
  assert.equal(status, 400);
});

test("changing password requires the current password", async () => {
  const { status } = await patchJson("/users/me", { password: "brandnew123" });
  assert.equal(status, 400);

  const wrong = await patchJson("/users/me", {
    password: "brandnew123",
    currentPassword: "definitely-wrong",
  });
  assert.equal(wrong.status, 400);
  assert.match(wrong.data.message, /incorrect/i);
});

test("changing password with the right credentials works and new password logs in", async () => {
  const { status } = await patchJson("/users/me", {
    password: newPassword,
    currentPassword: originalPassword,
  });
  assert.equal(status, 200);

  const oldLogin = await postJson(baseUrl, "/users/login", {
    email: currentEmail,
    password: originalPassword,
  });
  assert.equal(oldLogin.status, 401);
});

test("GET /settings/institute returns institute settings", async () => {
  const { status, data } = await getJson(baseUrl, "/settings/institute", token);
  assert.equal(status, 200);
  assert.equal(data.id, 1);
  assert.equal(typeof data.name, "string");
});

test("PATCH /settings/institute is restricted to admins", async () => {
  const { status } = await patchJson("/settings/institute", { name: "Hacked" });
  assert.equal(status, 403);
});

test("admin can update institute settings", async () => {
  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
  const login = await postJson(baseUrl, "/users/login", {
    email: currentEmail,
    password: newPassword,
  });
  assert.equal(login.status, 200);
  const adminToken = login.data.token;

  const { status, data } = await patchJson(
    "/settings/institute",
    { name: "Green Valley High", tagline: "Knowledge for all", email: "info@greenvalley.example" },
    adminToken,
  );

  assert.equal(status, 200);
  assert.equal(data.name, "Green Valley High");
  assert.equal(data.tagline, "Knowledge for all");

  const fetch = await getJson(baseUrl, "/settings/institute", adminToken);
  assert.equal(fetch.data.name, "Green Valley High");
});