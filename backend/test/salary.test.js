import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  postJson,
  getJson,
  patchJson,
  uniqueEmail,
  between,
  cleanupTestUsers,
} from "./helpers.js";
import prisma from "../src/prisma";

let server;
let baseUrl;
let token;
let userId;

const post = (path, body) => postJson(baseUrl, path, body, token);
const get = (path) => getJson(baseUrl, path, token);
const patch = (path, body) => patchJson(baseUrl, path, body, token);

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
    name: "Salary Admin",
    email: uniqueEmail("salary-user"),
    password: "password123",
  });
  userId = registration.data.id;

  await prisma.user.update({
    where: { id: userId },
    data: { role: "FINANCE" },
  });

  const login = await postJson(baseUrl, "/users/login", {
    email: registration.data.email,
    password: "password123",
  });
  token = login.data.token;
});

after(async () => {
  await prisma.salaryPayment.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("POST /staff creates a staff member without salary data", async () => {
  const { status, data } = await post("/staff", {
    staffNo: `ST-${between(1000, 9999)}`,
    name: "Teacher One",
    designation: "TEACHER",
  });

  assert.equal(status, 201);
  assert.equal(data.designation, "TEACHER");
  assert.equal(Object.hasOwn(data, "salary"), false);

  await prisma.staff.delete({ where: { id: data.id } });
});

test("staff salary values must be managed through salary rates", async () => {
  const { status, data } = await post("/staff", {
    staffNo: `ST-${between(1000, 9999)}`,
    name: "Staff With Salary",
    salary: 30000,
  });

  assert.equal(status, 400);
  assert.match(data.message, /Salaries section/);

  const staff = await post("/staff", {
    staffNo: `ST-${between(1000, 9999)}`,
    name: "Staff Update",
  });
  const update = await patch(`/staff/${staff.data.id}`, { salary: 31000 });
  assert.equal(update.status, 400);
  await prisma.staff.delete({ where: { id: staff.data.id } });
});

test("duplicate staff numbers are rejected", async () => {
  const staffNo = `ST-${between(1000, 9999)}`;
  await post("/staff", { staffNo, name: "First" });
  const { status } = await post("/staff", { staffNo, name: "Second" });

  assert.equal(status, 409);
});

test("POST /salary-payments pays a staff member and prevents double payment", async () => {
  const staff = await post("/staff", { staffNo: `ST-${between(1000, 9999)}`, name: "Paid Teacher" });

  const { status, data } = await post("/salary-payments", {
    staffId: staff.data.id,
    periodMonth: "2026-09",
    amount: 40000,
  });

  assert.equal(status, 201);
  assert.equal(data.amount, 40000);
  assert.equal(data.transaction, undefined);

  const all = await get("/salary-payments");
  assert.ok(all.data.some((p) => p.staff && p.staff.id === staff.data.id));

  const duplicate = await post("/salary-payments", {
    staffId: staff.data.id,
    periodMonth: "2026-09",
    amount: 40000,
  });
  assert.equal(duplicate.status, 409);

  await prisma.salaryPayment.deleteMany({ where: { staffId: staff.data.id } });
  await prisma.staff.delete({ where: { id: staff.data.id } });
});

test("salary payment uses the rate effective for its month", async () => {
  const staff = await post("/staff", { staffNo: `ST-${between(1000, 9999)}`, name: "Default Teacher" });
  await post("/salaries/rates", {
    staffId: staff.data.id,
    amount: 30000,
    effectiveFrom: "2025-01-01",
  });
  const secondRate = await post("/salaries/rates", {
    staffId: staff.data.id,
    amount: 50000,
    effectiveFrom: "2026-06-01",
  });

  const priorMonth = await post("/salaries/payments", {
    staffId: staff.data.id,
    periodMonth: "2026-05",
  });
  assert.equal(priorMonth.status, 201);
  assert.equal(priorMonth.data.amount, 30000);

  const { status, data } = await post("/salaries/payments", {
    staffId: staff.data.id,
    periodMonth: "2026-07",
  });
  assert.equal(status, 201);
  assert.equal(data.amount, 50000);

  await patch(`/salaries/rates/${secondRate.data.id}`, { amount: 60000 });
  const unchanged = await get("/salaries/payments");
  assert.equal(
    unchanged.data.find((payment) => payment.id === data.id).amount,
    50000,
  );

  await prisma.salaryPayment.deleteMany({ where: { staffId: staff.data.id } });
  await prisma.staff.delete({ where: { id: staff.data.id } });
});

test("salary rate history supports create, duplicate validation, update and delete", async () => {
  const staff = await post("/staff", {
    staffNo: `ST-${between(1000, 9999)}`,
    name: "Rate History Teacher",
  });
  const rate = await post("/salaries/rates", {
    staffId: staff.data.id,
    amount: 30000,
    effectiveFrom: "2025-01-01",
  });
  assert.equal(rate.status, 201);

  const history = await get("/salaries/rates");
  assert.ok(history.data.some((item) => item.id === rate.data.id));

  const duplicate = await post("/salaries/rates", {
    staffId: staff.data.id,
    amount: 35000,
    effectiveFrom: "2025-01-01",
  });
  assert.equal(duplicate.status, 409);

  const updated = await patch(`/salaries/rates/${rate.data.id}`, {
    amount: 32000,
    effectiveFrom: "2025-02-01",
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.amount, 32000);
  assert.equal(String(updated.data.effectiveFrom).slice(0, 10), "2025-02-01");

  const removed = await deleteJson(`/salaries/rates/${rate.data.id}`);
  assert.equal(removed.status, 204);
  await prisma.staff.delete({ where: { id: staff.data.id } });
});

test("salary payment without an effective rate requires an explicit amount", async () => {
  const staff = await post("/staff", { staffNo: `ST-${between(1000, 9999)}`, name: "Unrated Teacher" });
  const response = await post("/salaries/payments", {
    staffId: staff.data.id,
    periodMonth: "2025-01",
  });

  assert.equal(response.status, 400);
  assert.match(response.data.message, /No salary rate/);

  const explicit = await post("/salaries/payments", {
    staffId: staff.data.id,
    periodMonth: "2025-01",
    amount: 25000,
  });
  assert.equal(explicit.status, 201);
  assert.equal(explicit.data.amount, 25000);

  await prisma.salaryPayment.deleteMany({ where: { staffId: staff.data.id } });
  await prisma.staff.delete({ where: { id: staff.data.id } });
});

test("staff with salary payments cannot be deleted", async () => {
  const staff = await post("/staff", { staffNo: `ST-${between(1000, 9999)}`, name: "Guarded Teacher" });

  await post("/salary-payments", {
    staffId: staff.data.id,
    periodMonth: "2026-11",
    amount: 20000,
  });

  const { status } = await deleteJson(`/staff/${staff.data.id}`);
  assert.equal(status, 400);

  await prisma.salaryPayment.deleteMany({ where: { staffId: staff.data.id } });
  await prisma.staff.delete({ where: { id: staff.data.id } });
});