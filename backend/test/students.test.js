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
let token;
let userId;

const patchJson = async (path, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

const deleteJson = async (path) => {
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

  const registration = await postJson(baseUrl, "/users", {
    name: "Student Admin",
    email: uniqueEmail("student-user"),
    password: "password123",
  });
  userId = registration.data.id;

  await prisma.user.update({
    where: { id: userId },
    data: { role: "TEACHER" },
  });

  const login = await postJson(baseUrl, "/users/login", {
    email: registration.data.email,
    password: "password123",
  });
  token = login.data.token;
});

after(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("POST /students creates a student", async () => {
  const { status, data } = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Ali Ahmed", guardianName: "Mr Ahmed", status: "ACTIVE" },
    token,
  );

  assert.equal(status, 201);
  assert.equal(data.name, "Ali Ahmed");
  assert.equal(data.guardianName, "Mr Ahmed");
  assert.equal(data.status, "ACTIVE");

  await prisma.student.delete({ where: { id: data.id } });
});

test("duplicate admission numbers are rejected", async () => {
  const admissionNo = `ADM-${between(1000, 9999)}`;
  const first = await postJson(baseUrl, "/students", { admissionNo, name: "First" }, token);
  assert.equal(first.status, 201);

  const { status } = await postJson(baseUrl, "/students", { admissionNo, name: "Second" }, token);
  assert.equal(status, 409);

  await prisma.student.delete({ where: { id: first.data.id } });
});

test("GET /students/:id omits fee and refund data for teachers", async () => {
  const { data: student } = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Detail Me" },
    token,
  );

  const { status, data } = await getJson(baseUrl, `/students/${student.id}`, token);
  assert.equal(status, 200);
  assert.equal(data.name, "Detail Me");
  assert.equal(data.feePlans, undefined);
  assert.equal(data.totalRefunded, undefined);
  assert.equal(data.refunds, undefined);

  await prisma.student.delete({ where: { id: student.id } });
});

test("PATCH /students updates fields", async () => {
  const { data: student } = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Old Name" },
    token,
  );

  const { status, data } = await patchJson(`/students/${student.id}`, {
    name: "New Name",
    status: "INACTIVE",
    phone: "12345",
  });

  assert.equal(status, 200);
  assert.equal(data.name, "New Name");
  assert.equal(data.status, "INACTIVE");
  assert.equal(data.phone, "12345");

  await prisma.student.delete({ where: { id: student.id } });
});

test("DELETE /students removes the student", async () => {
  const { data: student } = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Doomed" },
    token,
  );

  const { status } = await deleteJson(`/students/${student.id}`);
  assert.equal(status, 204);

  const gone = await prisma.student.findUnique({ where: { id: student.id } });
  assert.equal(gone, null);
});

test("GET /students filters by status", async () => {
  const active = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Active Kid" },
    token,
  );
  const inactive = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Inactive Kid", status: "INACTIVE" },
    token,
  );

  const { status, data } = await getJson(baseUrl, "/students?status=INACTIVE", token);
  assert.equal(status, 200);
  assert.ok(data.some((s) => s.id === inactive.data.id));
  assert.ok(!data.some((s) => s.id === active.data.id));

  await prisma.student.deleteMany({ where: { id: { in: [active.data.id, inactive.data.id] } } });
});

test("POST /students/:id/account creates a STUDENT login and links it", async () => {
  const { data: student } = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Link Me" },
    token,
  );

  const accountEmail = uniqueEmail("linked");
  const { status, data } = await postJson(
    baseUrl,
    `/students/${student.id}/account`,
    { name: "Linked Me", email: accountEmail, password: "password123" },
    token,
  );

  assert.equal(status, 201);
  assert.equal(data.user.email, accountEmail);
  assert.equal(data.user.role, "STUDENT");
  assert.equal(data.student.id, student.id);

  const stored = await prisma.student.findUnique({ where: { id: student.id } });
  assert.equal(stored.accountId, data.user.id);

  await prisma.student.delete({ where: { id: student.id } });
  await prisma.user.delete({ where: { id: data.user.id } });
});

test("a student cannot be linked twice", async () => {
  const { data: student } = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Double Link" },
    token,
  );

  await postJson(
    baseUrl,
    `/students/${student.id}/account`,
    { email: uniqueEmail("link-one"), password: "password123" },
    token,
  );
  const second = await postJson(
    baseUrl,
    `/students/${student.id}/account`,
    { email: uniqueEmail("link-two"), password: "password123" },
    token,
  );
  assert.equal(second.status, 409);

  const account = await prisma.student.findUnique({ where: { id: student.id } });
  await prisma.student.delete({ where: { id: student.id } });
  await prisma.user.delete({ where: { id: account.accountId } });
});

test("GET /students/me returns the linked student's portal", async () => {
  const { data: student } = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Portal Me" },
    token,
  );

  const accountEmail = uniqueEmail("portal");
  const linked = await postJson(
    baseUrl,
    `/students/${student.id}/account`,
    { email: accountEmail, password: "password123" },
    token,
  );

  const login = await postJson(baseUrl, "/users/login", {
    email: accountEmail,
    password: "password123",
  });
  assert.equal(login.status, 200);

  const { status, data } = await getJson(baseUrl, "/students/me", login.data.token);
  assert.equal(status, 200);
  assert.equal(data.student.id, student.id);
  assert.equal(data.student.name, "Portal Me");
  assert.ok(Array.isArray(data.feePlans));
  assert.ok(Array.isArray(data.refunds));
  assert.ok(data.totals && typeof data.totals.outstandingDues === "number");

  await prisma.student.delete({ where: { id: student.id } });
  await prisma.user.deleteMany({ where: { id: { in: [linked.data.user.id, login.data.user.id] } } });
});

test("DELETE /students/:id/account unlinks the login", async () => {
  const { data: student } = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Unlink Me" },
    token,
  );

  const linked = await postJson(
    baseUrl,
    `/students/${student.id}/account`,
    { email: uniqueEmail("unlink"), password: "password123" },
    token,
  );

  const { status } = await deleteJson(`/students/${student.id}/account`);
  assert.equal(status, 204);

  const stored = await prisma.student.findUnique({ where: { id: student.id } });
  assert.equal(stored.accountId, null);

  await prisma.student.delete({ where: { id: student.id } });
  await prisma.user.delete({ where: { id: linked.data.user.id } });
});