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

const createPaidStudent = async () => {
  const feeType = await post("/fees/types", {
    name: `Fee-${between(1000, 9999)}`,
    amount: 2000,
    period: "ONE_TIME",
  });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Refund Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 2000,
  });
  const planDetail = await get(`/fees/plans/${plan.data.id}`);
  const installment = planDetail.data.installments[0];

  await post("/fees/payments", {
    installmentId: installment.id,
    amount: 2000,
  });

  return { feeType, student, plan, installment };
};

before(async () => {
  ({ server, baseUrl } = await startServer());

  const registration = await postJson(baseUrl, "/users", {
    name: "Refund Admin",
    email: uniqueEmail("refund-user"),
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
  await prisma.refund.deleteMany({ where: { userId } });
  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("POST /refunds creates a refund for a paid student", async () => {
  const { feeType, student, plan } = await createPaidStudent();

  const { status, data } = await post("/refunds", {
    studentId: student.data.id,
    amount: 500,
    reason: "Withdrawal",
  });

  assert.equal(status, 201);
  assert.equal(data.amount, 500);
  assert.equal(data.reason, "Withdrawal");
  assert.equal(data.transaction, undefined);

  const refunds = await get("/refunds");
  assert.ok(refunds.data.some((r) => r.student && r.student.id === student.data.id));

  await prisma.refund.deleteMany({ where: { studentId: student.data.id } });
  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});

test("refunds cannot exceed the amount collected", async () => {
  const { feeType, student, plan } = await createPaidStudent();

  const { status } = await post("/refunds", {
    studentId: student.data.id,
    amount: 2500,
    reason: "Too much",
  });

  assert.equal(status, 400);

  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});

test("DELETE /refunds removes the refund", async () => {
  const { feeType, student, plan } = await createPaidStudent();

  const created = await post("/refunds", {
    studentId: student.data.id,
    amount: 400,
    reason: "Reversal test",
  });
  assert.equal(created.status, 201);

  const { status } = await deleteJson(`/refunds/${created.data.id}`);
  assert.equal(status, 204);

  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});