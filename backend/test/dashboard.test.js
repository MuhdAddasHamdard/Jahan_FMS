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
let adminId;
let adminToken;
let memberToken;
let teacherId;
let teacherToken;
let officeTeacherId;
let baseline;
let seedReceiptNumber;

before(async () => {
  ({ server, baseUrl } = await startServer());

  const admin = await postJson(baseUrl, "/users", {
    name: "Dash Admin",
    email: uniqueEmail("dash-admin"),
    password: "password123",
  });
  adminId = admin.data.id;
  await prisma.user.update({
    where: { id: adminId },
    data: { role: "ADMIN" },
  });
  const adminLogin = await postJson(baseUrl, "/users/login", {
    email: admin.data.email,
    password: "password123",
  });
  adminToken = adminLogin.data.token;

  baseline = await getJson(baseUrl, "/dashboard/summary", adminToken);
  if (baseline.status !== 200) {
    throw new Error(`baseline dashboard failed: ${JSON.stringify(baseline)}`);
  }

  const member = await postJson(baseUrl, "/users", {
    name: "Dash Member",
    email: uniqueEmail("dash-member"),
    password: "password123",
  });
  const memberLogin = await postJson(baseUrl, "/users/login", {
    email: member.data.email,
    password: "password123",
  });
  memberToken = memberLogin.data.token;

  const teacher = await postJson(baseUrl, "/users", {
    name: "Dash Teacher",
    email: uniqueEmail("dash-teacher"),
    password: "password123",
  });
  teacherId = teacher.data.id;
  await prisma.user.update({
    where: { id: teacherId },
    data: { role: "TEACHER" },
  });
  const teacherLogin = await postJson(baseUrl, "/users/login", {
    email: teacher.data.email,
    password: "password123",
  });
  teacherToken = teacherLogin.data.token;

  const teacherCls = await postJson(
    baseUrl,
    "/classes",
    { name: "Teacher Grade" },
    teacherToken,
  );
  await postJson(
    baseUrl,
    "/students",
    {
      admissionNo: `ADM-${between(1000, 9999)}`,
      name: "Teacher Student",
      classId: teacherCls.data.id,
    },
    teacherToken,
  );
  await postJson(
    baseUrl,
    `/classes/${teacherCls.data.id}/materials`,
    { title: "Teacher Material" },
    teacherToken,
  );

  const officeTeacher = await postJson(baseUrl, "/users", {
    name: "Dash Office Teacher",
    email: uniqueEmail("dash-office-teacher"),
    password: "password123",
  });
  officeTeacherId = officeTeacher.data.id;
  await prisma.user.update({
    where: { id: officeTeacherId },
    data: { role: "TEACHER" },
  });

  const cls = await postJson(
    baseUrl,
    "/classes",
    { name: "Dash Grade", teacherId: officeTeacherId },
    adminToken,
  );
  const student = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Dash Student", classId: cls.data.id },
    adminToken,
  );
  const feeType = await postJson(
    baseUrl,
    "/fees/types",
    { name: "Dash Fee", amount: 2000, period: "ONE_TIME" },
    adminToken,
  );
  const plan = await postJson(
    baseUrl,
    "/fees/plans",
    { studentId: student.data.id, feeTypeId: feeType.data.id, totalAmount: 2000 },
    adminToken,
  );
  const planDetail = await getJson(baseUrl, `/fees/plans/${plan.data.id}`, adminToken);
  const installment = planDetail.data.installments[0];

  const payment = await postJson(
    baseUrl,
    "/fees/payments",
    { installmentId: installment.id, amount: 800 },
    adminToken,
  );
  if (payment.status !== 201) {
    throw new Error(`seed payment failed: ${JSON.stringify(payment)}`);
  }
  seedReceiptNumber = payment.data.receipt.number;
});

after(async () => {
  await prisma.user.deleteMany({
    where: { id: { in: [adminId, teacherId] } },
  });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("GET /dashboard/summary reports auto-computed fee finances scoped to the user", async () => {
  const { status, data } = await getJson(baseUrl, "/dashboard/summary", adminToken);

  assert.equal(status, 200);
  assert.equal(data.monthlyFeeCollected, baseline.data.monthlyFeeCollected + 800);
  assert.equal(data.monthlyRefunds, baseline.data.monthlyRefunds);
  assert.equal(data.monthlySalaries, baseline.data.monthlySalaries);
  assert.equal(data.monthlyExpenses, baseline.data.monthlyExpenses);
  assert.equal(data.monthlyNet, baseline.data.monthlyNet + 800);
  assert.equal(data.studentCount, baseline.data.studentCount + 2);
  assert.equal(data.classCount, baseline.data.classCount + 2);
  assert.equal(data.feeTypeCount, baseline.data.feeTypeCount + 1);
  assert.ok(data.recentReceipts.length >= 1);
  assert.ok(
    data.recentReceipts.some(
      (receipt) => receipt.number === seedReceiptNumber && receipt.student,
    ),
  );
  assert.match(data.recentReceipts[0].number, /^RC-\d+$/);
  assert.equal(data.totalUsers, undefined);
});

test("GET /dashboard/admin/summary is forbidden for non-admin users", async () => {
  const { status } = await getJson(baseUrl, "/dashboard/admin/summary", memberToken);
  assert.equal(status, 403);
});

test("GET /dashboard/admin/summary returns org-wide totals for ADMIN", async () => {
  const { status, data } = await getJson(baseUrl, "/dashboard/admin/summary", adminToken);

  assert.equal(status, 200);
  assert.ok(data.totalUsers >= 2);
  assert.ok(data.monthlyFeeCollected >= 800);
  assert.ok(data.classCount >= 1);
  assert.ok(data.recentReceipts.length > 0);
});

test("GET /dashboard/teacher returns class, student and material counts with no money fields", async () => {
  const { status, data } = await getJson(baseUrl, "/dashboard/teacher", teacherToken);

  assert.equal(status, 200);
  assert.equal(data.classCount, 1);
  assert.equal(data.studentCount, 1);
  assert.equal(data.materialCount, 1);
  assert.equal(data.classes.length, 1);
  assert.equal(data.classes[0].studentCount, 1);
  assert.equal(data.classes[0].materials.length, 1);
  assert.ok("teacher" in data.classes[0]);
  assert.equal(data.feeCollected, undefined);
  assert.equal(data.monthlyNet, undefined);
  assert.equal(data.outstandingDues, undefined);
  assert.equal(data.expenses, undefined);
  assert.equal(data.receiptCount, undefined);
});

test("GET /dashboard/teacher is forbidden without the TEACHER role", async () => {
  const asAdmin = await getJson(baseUrl, "/dashboard/teacher", adminToken);
  const asMember = await getJson(baseUrl, "/dashboard/teacher", memberToken);

  assert.equal(asAdmin.status, 403);
  assert.equal(asMember.status, 403);
});

test("GET /dashboard/summary is forbidden for teachers (money is not visible to them)", async () => {
  const { status } = await getJson(baseUrl, "/dashboard/summary", teacherToken);
  assert.equal(status, 403);
});

test("GET /reports/institute is forbidden for teachers (money is not visible to them)", async () => {
  const { status } = await getJson(baseUrl, "/reports/institute", teacherToken);
  assert.equal(status, 403);
});

test("GET /students/:id omits fee and refund money data for teachers", async () => {
  const teacherStudent = await getJson(baseUrl, "/students", teacherToken);
  const asTeacher = await getJson(
    baseUrl,
    `/students/${teacherStudent.data[0].id}`,
    teacherToken,
  );
  const adminStudent = await getJson(baseUrl, "/students", adminToken);
  const target = adminStudent.data.find((record) => record.name === "Dash Student");
  assert.ok(target, "expected the seeded Dash Student to be visible to the admin");
  const asAdmin = await getJson(baseUrl, `/students/${target.id}`, adminToken);

  assert.equal(asTeacher.status, 200);
  assert.equal(asTeacher.data.name, "Teacher Student");
  assert.equal(asTeacher.data.feePlans, undefined);
  assert.equal(asTeacher.data.refunds, undefined);
  assert.equal(asTeacher.data.totalRefunded, undefined);
  assert.equal(asTeacher.data.account, null);
  assert.equal(asAdmin.status, 200);
  assert.ok(Array.isArray(asAdmin.data.feePlans));
  assert.equal(asAdmin.data.feePlans.length, 1);
});