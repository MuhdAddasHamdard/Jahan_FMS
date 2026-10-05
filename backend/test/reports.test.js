import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  startServer,
  postJson,
  getJson,
  uniqueEmail,
  between,
} from "./helpers.js";
import prisma from "../src/prisma";

let server;
let baseUrl;
let token;
let userId;
let email;

before(async () => {
  ({ server, baseUrl } = await startServer());

  const registration = await postJson(baseUrl, "/users", {
    name: "Report User",
    email: uniqueEmail("report-user"),
    password: "password123",
  });
  userId = registration.data.id;
  email = registration.data.email;

  await prisma.user.update({
    where: { id: userId },
    data: { role: "FINANCE" },
  });

  const login = await postJson(baseUrl, "/users/login", {
    email,
    password: "password123",
  });
  token = login.data.token;
});

after(async () => {
  await prisma.user.deleteMany({ where: { id: userId } });
  await new Promise((resolve) => server.close(resolve));
});

test("GET /reports/summary computes income, refunds, salaries and expenses", async () => {
  const feeType = await postJson(
    baseUrl,
    "/fees/types",
    { name: "Tuition", amount: 1000, period: "ONE_TIME" },
    token,
  );
  const student = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Report Student" },
    token,
  );
  const plan = await postJson(
    baseUrl,
    "/fees/plans",
    { studentId: student.data.id, feeTypeId: feeType.data.id, totalAmount: 1000 },
    token,
  );
  const planDetail = await getJson(baseUrl, `/fees/plans/${plan.data.id}`, token);
  const installment = planDetail.data.installments[0];

  const payment = await postJson(
    baseUrl,
    "/fees/payments",
    { installmentId: installment.id, amount: 500 },
    token,
  );
  assert.equal(payment.status, 201);

  const refund = await postJson(
    baseUrl,
    "/refunds",
    { studentId: student.data.id, amount: 200, reason: "Withdrawal" },
    token,
  );
  assert.equal(refund.status, 201);

  const staff = await postJson(
    baseUrl,
    "/staff",
    { staffNo: `ST-${between(1000, 9999)}`, name: "Paid Teacher", salary: 300 },
    token,
  );
  const salary = await postJson(
    baseUrl,
    "/salary-payments",
    { staffId: staff.data.id, periodMonth: "2026-09" },
    token,
  );
  assert.equal(salary.status, 201);

  const expense = await postJson(
    baseUrl,
    "/expenses",
    { description: "Stationery", amount: 100 },
    token,
  );
  assert.equal(expense.status, 201);

  const { status, data } = await getJson(baseUrl, "/reports/summary", token);
  assert.equal(status, 200);
  assert.equal(data.totals.totalIncome, 500);
  assert.equal(data.totals.totalRefunds, 200);
  assert.equal(data.totals.totalSalaries, 300);
  assert.equal(data.totals.totalExpenses, 100);
  assert.equal(data.totals.totalExpense, 600);
  assert.equal(data.totals.net, -100);
  assert.equal(data.totals.feeCount, 1);
  assert.ok(Array.isArray(data.byMonth));
  assert.ok(data.byMonth.length >= 1);

  await prisma.salaryPayment.deleteMany({ where: { userId } });
  await prisma.expense.deleteMany({ where: { userId } });
  await prisma.refund.deleteMany({ where: { userId } });
  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
  await prisma.staff.delete({ where: { id: staff.data.id } });
});

test("GET /reports/summary supports date range filtering and rejects bad ranges", async () => {
  const feeType = await postJson(
    baseUrl,
    "/fees/types",
    { name: "Date Fee", amount: 1000, period: "ONE_TIME" },
    token,
  );
  const student = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Date Student" },
    token,
  );
  const plan = await postJson(
    baseUrl,
    "/fees/plans",
    { studentId: student.data.id, feeTypeId: feeType.data.id, totalAmount: 1000 },
    token,
  );
  const planDetail = await getJson(baseUrl, `/fees/plans/${plan.data.id}`, token);
  const installment = planDetail.data.installments[0];

  const recent = await postJson(
    baseUrl,
    "/fees/payments",
    { installmentId: installment.id, amount: 100 },
    token,
  );
  await prisma.receipt.update({
    where: { id: recent.data.receipt.id },
    data: { paidAt: new Date("2026-01-15T00:00:00Z") },
  });

  const oldPayment = await postJson(
    baseUrl,
    "/fees/payments",
    { installmentId: installment.id, amount: 200 },
    token,
  );
  await prisma.receipt.update({
    where: { id: oldPayment.data.receipt.id },
    data: { paidAt: new Date("2020-01-15T00:00:00Z") },
  });

  const filtered = await getJson(
    baseUrl,
    "/reports/summary?from=2026-01-01&to=2026-01-31",
    token,
  );
  assert.equal(filtered.status, 200);
  assert.equal(filtered.data.totals.totalIncome, 100);

  const unfiltered = await getJson(baseUrl, "/reports/summary", token);
  assert.equal(unfiltered.data.totals.totalIncome, 300);

  const badRange = await getJson(
    baseUrl,
    "/reports/summary?from=2026-06-01&to=2026-01-01",
    token,
  );
  assert.equal(badRange.status, 400);

  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});

test("GET /reports/institute shows collections, expenses and outstanding dues", async () => {
  const from = new Date().toISOString();
  const feeType = await postJson(
    baseUrl,
    "/fees/types",
    { name: "Institute Fee", amount: 2000, period: "ONE_TIME" },
    token,
  );
  const student = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Institute Student" },
    token,
  );
  const plan = await postJson(
    baseUrl,
    "/fees/plans",
    { studentId: student.data.id, feeTypeId: feeType.data.id, totalAmount: 2000, installmentCount: 2 },
    token,
  );
  const planDetail = await getJson(baseUrl, `/fees/plans/${plan.data.id}`, token);
  const installment = planDetail.data.installments[0];

  await postJson(
    baseUrl,
    "/fees/payments",
    { installmentId: installment.id, amount: 500 },
    token,
  );

  await postJson(
    baseUrl,
    "/expenses",
    { description: "Utilities", amount: 100 },
    token,
  );

  const to = new Date(Date.now() + 5000).toISOString();
  const { status, data } = await getJson(
    baseUrl,
    `/reports/institute?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    token,
  );

  assert.equal(status, 200);
  assert.equal(data.totals.feeCount, 1);
  assert.equal(data.totals.feeCollected, 500);
  assert.equal(data.totals.netCollected, 500);
  assert.equal(data.totals.expenseCount, 1);
  assert.equal(data.totals.expenses, 100);
  assert.equal(data.totals.netResult, 400);
  assert.equal(data.totals.outstandingDues, 1500);
  assert.equal(data.totals.studentsWithDues, 1);

  await prisma.expense.deleteMany({ where: { userId } });
  await prisma.receipt.deleteMany({ where: { userId } });
  await prisma.studentFee.delete({ where: { id: plan.data.id } });
  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.feeType.delete({ where: { id: feeType.data.id } });
});