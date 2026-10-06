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

const post = (path, body) => postJson(baseUrl, path, body, token);
const get = (path) => getJson(baseUrl, path, token);

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

test("POST /staff creates a staff member", async () => {
  const { status, data } = await post("/staff", {
    staffNo: `ST-${between(1000, 9999)}`,
    name: "Teacher One",
    designation: "TEACHER",
    salary: 30000,
  });

  assert.equal(status, 201);
  assert.equal(data.designation, "TEACHER");
  assert.equal(data.salary, 30000);

  await prisma.staff.delete({ where: { id: data.id } });
});

test("duplicate staff numbers are rejected", async () => {
  const staffNo = `ST-${between(1000, 9999)}`;
  await post("/staff", { staffNo, name: "First", salary: 10000 });
  const { status } = await post("/staff", { staffNo, name: "Second", salary: 10000 });

  assert.equal(status, 409);
});

test("POST /salary-payments pays a staff member and prevents double payment", async () => {
  const staff = await post("/staff", { staffNo: `ST-${between(1000, 9999)}`, name: "Paid Teacher", salary: 40000 });

  const { status, data } = await post("/salary-payments", {
    staffId: staff.data.id,
    periodMonth: "2026-09",
  });

  assert.equal(status, 201);
  assert.equal(data.amount, 40000);
  assert.equal(data.transaction, undefined);

  const all = await get("/salary-payments");
  assert.ok(all.data.some((p) => p.staff && p.staff.id === staff.data.id));

  const duplicate = await post("/salary-payments", {
    staffId: staff.data.id,
    periodMonth: "2026-09",
  });
  assert.equal(duplicate.status, 409);

  await prisma.salaryPayment.deleteMany({ where: { staffId: staff.data.id } });
  await prisma.staff.delete({ where: { id: staff.data.id } });
});

test("salary payment defaults to the staff salary when amount is omitted", async () => {
  const staff = await post("/staff", { staffNo: `ST-${between(1000, 9999)}`, name: "Default Teacher", salary: 50000 });

  const { status, data } = await post("/salary-payments", {
    staffId: staff.data.id,
    periodMonth: "2026-10",
  });

  assert.equal(status, 201);
  assert.equal(data.amount, 50000);

  await prisma.salaryPayment.deleteMany({ where: { staffId: staff.data.id } });
  await prisma.staff.delete({ where: { id: staff.data.id } });
});

test("staff with salary payments cannot be deleted", async () => {
  const staff = await post("/staff", { staffNo: `ST-${between(1000, 9999)}`, name: "Guarded Teacher", salary: 20000 });

  await post("/salary-payments", {
    staffId: staff.data.id,
    periodMonth: "2026-11",
  });

  const { status } = await deleteJson(`/staff/${staff.data.id}`);
  assert.equal(status, 400);

  await prisma.salaryPayment.deleteMany({ where: { staffId: staff.data.id } });
  await prisma.staff.delete({ where: { id: staff.data.id } });
});