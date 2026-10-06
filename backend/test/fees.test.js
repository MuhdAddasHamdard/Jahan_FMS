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
    name: "Fee Admin",
    email: uniqueEmail("fee-user"),
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
  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("POST /fees/types creates a fee type", async () => {
  const { status, data } = await post("/fees/types", {
    name: "Tuition",
    amount: 5000,
    period: "MONTHLY",
  });

  assert.equal(status, 201);
  assert.equal(data.name, "Tuition");
  assert.equal(data.amount, 5000);
  assert.equal(data.category, undefined);

  await prisma.feeType.delete({ where: { id: data.id } });
});

test("fee plan creation generates installments and amounts sum to total", async () => {
  const feeType = await post("/fees/types", {
    name: "Session Fee",
    amount: 9000,
    period: "SESSION",
  });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Fee Student",
  });

  const { status, data } = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 9000,
    installmentCount: 3,
  });

  assert.equal(status, 201);
  assert.equal(data.installmentCount, 3);
  assert.equal(data.installments.length, 3);
  const sum = data.installments.reduce((total, i) => total + i.amount, 0);
  assert.equal(sum, 9000);
  assert.ok(data.installments.every((i) => i.status === "PENDING"));

  await prisma.studentFee.delete({ where: { id: data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});

test("duplicate fee plans are rejected", async () => {
  const feeType = await post("/fees/types", { name: "Dup Fee", amount: 1000 });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Dup Student",
  });

  await post("/fees/plans", { studentId: student.data.id, feeTypeId: feeType.data.id, totalAmount: 1000 });
  const { status } = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 1000,
  });

  assert.equal(status, 409);

  const plan = await prisma.studentFee.findFirst({ where: { studentId: student.data.id } });
  await prisma.studentFee.delete({ where: { id: plan.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});

test("collecting a payment marks the installment and creates a receipt", async () => {
  const feeType = await post("/fees/types", {
    name: "Collect Fee",
    amount: 3000,
    period: "ONE_TIME",
  });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Pay Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 3000,
    installmentCount: 1,
  });
  const planDetail = await get(`/fees/plans/${plan.data.id}`);
  const installment = planDetail.data.installments[0];

  const { status, data } = await post("/fees/payments", {
    installmentId: installment.id,
    amount: 2000,
  });

  assert.equal(status, 201);
  assert.match(data.receipt.number, /^RC-\d+$/);
  assert.equal(data.installment.status, "PARTIAL");
  assert.equal(data.installment.paidAmount, 2000);

  const receipts = await get("/fees/receipts");
  assert.equal(receipts.status, 200);
  assert.ok(receipts.data.some((r) => r.student && r.student.id === student.data.id));

  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});

test("paying more than the remaining balance is rejected", async () => {
  const feeType = await post("/fees/types", { name: "Over Fee", amount: 1000 });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Over Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 1000,
  });
  const planDetail = await get(`/fees/plans/${plan.data.id}`);
  const installment = planDetail.data.installments[0];

  const { status } = await post("/fees/payments", {
    installmentId: installment.id,
    amount: 1500,
  });

  assert.equal(status, 400);

  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});

test("fee plans with payments cannot be deleted", async () => {
  const feeType = await post("/fees/types", { name: "Guarded Fee", amount: 1000 });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Guarded Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 1000,
  });
  const planDetail = await get(`/fees/plans/${plan.data.id}`);
  const installment = planDetail.data.installments[0];

  await post("/fees/payments", {
    installmentId: installment.id,
    amount: 1000,
  });

  const { status } = await deleteJson(`/fees/plans/${plan.data.id}`);
  assert.equal(status, 400);

  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});

test("GET /reports/institute shows fee collections and outstanding dues", async () => {
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 60000).toISOString();
  const rangeUrl = `/reports/institute?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const before = await get(rangeUrl);
  assert.equal(before.status, 200);

  const feeType = await post("/fees/types", {
    name: "Report Fee",
    amount: 2000,
    period: "ONE_TIME",
  });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Report Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 2000,
    installmentCount: 2,
  });
  const planDetail = await get(`/fees/plans/${plan.data.id}`);
  const installment = planDetail.data.installments[0];

  await post("/fees/payments", {
    installmentId: installment.id,
    amount: 500,
  });

  const { status, data } = await get(rangeUrl);

  assert.equal(status, 200);
  assert.equal(data.totals.feeCount, before.data.totals.feeCount + 1);
  assert.equal(data.totals.feeCollected, before.data.totals.feeCollected + 500);
  assert.equal(data.totals.netCollected, before.data.totals.netCollected + 500);
  assert.equal(data.totals.outstandingDues, before.data.totals.outstandingDues + 1500);
  assert.equal(data.totals.studentsWithDues, before.data.totals.studentsWithDues + 1);

  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});