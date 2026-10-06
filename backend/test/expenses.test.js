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

const post = (path, body) => postJson(baseUrl, path, body, token);
const get = (path) => getJson(baseUrl, path, token);

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
    name: "Expense Admin",
    email: uniqueEmail("expense-user"),
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
  await prisma.expense.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("POST /expenses creates an expense", async () => {
  const { status, data } = await post("/expenses", {
    description: "Electricity bill",
    amount: 8500,
  });

  assert.equal(status, 201);
  assert.equal(data.description, "Electricity bill");
  assert.equal(data.amount, 8500);
  assert.ok(data.paidOn);

  await prisma.expense.delete({ where: { id: data.id } });
});

test("POST /expenses requires a description and positive amount", async () => {
  const noDesc = await post("/expenses", { amount: 100 });
  assert.equal(noDesc.status, 400);

  const noAmount = await post("/expenses", { description: "Rent" });
  assert.equal(noAmount.status, 400);

  const negative = await post("/expenses", { description: "Oops", amount: -5 });
  assert.equal(negative.status, 400);
});

test("GET /expenses lists expenses newest first", async () => {
  const before = await get("/expenses");
  assert.equal(before.status, 200);

  await post("/expenses", { description: "First", amount: 100 });
  await post("/expenses", { description: "Second", amount: 200 });

  const { status, data } = await get("/expenses");
  assert.equal(status, 200);
  assert.equal(data.length, before.data.length + 2);
  assert.equal(data[0].description, "Second");
  assert.equal(data[1].description, "First");

  await prisma.expense.deleteMany({ where: { userId } });
});

test("GET /expenses filters by date range", async () => {
  const recent = await post("/expenses", { description: "Recent", amount: 50 });
  const old = await post("/expenses", { description: "Old", amount: 50 });
  await prisma.expense.update({
    where: { id: old.data.id },
    data: { paidOn: new Date("2020-01-15T00:00:00Z") },
  });

  const filtered = await get("/expenses?from=2026-01-01&to=2026-12-31");
  assert.equal(filtered.status, 200);
  assert.ok(filtered.data.some((e) => e.id === recent.data.id));
  assert.ok(!filtered.data.some((e) => e.id === old.data.id));

  await prisma.expense.deleteMany({ where: { userId } });
});

test("PATCH /expenses updates an expense", async () => {
  const created = await post("/expenses", { description: "Before", amount: 100 });

  const { status, data } = await patchJson(`/expenses/${created.data.id}`, {
    description: "After",
    amount: 250,
  });
  assert.equal(status, 200);
  assert.equal(data.description, "After");
  assert.equal(data.amount, 250);

  await prisma.expense.delete({ where: { id: created.data.id } });
});

test("DELETE /expenses removes an expense", async () => {
  const created = await post("/expenses", { description: "Doomed", amount: 10 });

  const { status } = await deleteJson(`/expenses/${created.data.id}`);
  assert.equal(status, 204);

  const gone = await prisma.expense.findUnique({ where: { id: created.data.id } });
  assert.equal(gone, null);
});