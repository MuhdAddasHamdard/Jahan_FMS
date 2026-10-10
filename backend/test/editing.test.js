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
let adminToken;
let adminId;
let financeToken;
let financeId;
let teacherId;

const post = (path, body, token = adminToken) => postJson(baseUrl, path, body, token);
const get = (path, token = adminToken) => getJson(baseUrl, path, token);
const patch = (path, body, token = adminToken) => patchJson(baseUrl, path, body, token);

const deleteJson = async (path, token = adminToken) => {
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

const createAdmin = async (prefix) => {
  const registration = await postJson(baseUrl, "/users", {
    name: "Edit Admin",
    email: uniqueEmail(prefix),
    password: "password123",
  });

  await prisma.user.update({
    where: { id: registration.data.id },
    data: { role: "ADMIN" },
  });

  const login = await postJson(baseUrl, "/users/login", {
    email: registration.data.email,
    password: "password123",
  });

  return { id: registration.data.id, token: login.data.token, email: registration.data.email };
};

before(async () => {
  ({ server, baseUrl } = await startServer());

  const admin = await createAdmin("edit-admin");
  adminId = admin.id;
  adminToken = admin.token;

  const finance = await createAdmin("edit-finance");
  financeId = finance.id;
  await prisma.user.update({
    where: { id: financeId },
    data: { role: "FINANCE" },
  });
  const financeLogin = await postJson(baseUrl, "/users/login", {
    email: finance.email,
    password: "password123",
  });
  financeToken = financeLogin.data.token;

  const teacher = await postJson(baseUrl, "/users", {
    name: "Edit Teacher",
    email: uniqueEmail("edit-teacher"),
    password: "password123",
  });
  await prisma.user.update({
    where: { id: teacher.data.id },
    data: { role: "TEACHER" },
  });
  teacherId = teacher.data.id;
});

after(async () => {
  await prisma.receipt.deleteMany({ where: { userId: { in: [adminId, financeId] } } });
  await prisma.studentFee.deleteMany({ where: { userId: { in: [adminId, financeId] } } });
  await prisma.refund.deleteMany({ where: { userId: { in: [adminId, financeId] } } });
  await prisma.salaryPayment.deleteMany({ where: { userId: { in: [adminId, financeId] } } });
  await prisma.feeType.deleteMany({ where: { userId: { in: [adminId, financeId] } } });
  await prisma.student.deleteMany({ where: { userId: { in: [adminId, financeId] } } });
  await prisma.staff.deleteMany({ where: { userId: { in: [adminId, financeId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, financeId] } } });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("PATCH /fees/plans/:id rebuilds installments for an unpaid plan", async () => {
  const feeType = await post("/fees/types", { name: "Editable Plan Fee", amount: 3000 });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Plan Edit Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 3000,
    installmentCount: 2,
  });

  const { status, data } = await patch(`/fees/plans/${plan.data.id}`, {
    totalAmount: 6000,
    installmentCount: 4,
  });

  assert.equal(status, 200);
  assert.equal(data.totalAmount, 6000);
  assert.equal(data.installmentCount, 4);
  assert.equal(data.installments.length, 4);
  assert.equal(
    data.installments.reduce((total, i) => total + i.amount, 0),
    6000,
  );
  assert.ok(data.installments.every((i) => i.status === "PENDING"));
});

test("PATCH /fees/plans/:id is rejected once payments exist", async () => {
  const feeType = await post("/fees/types", { name: "Paid Plan Fee", amount: 4000 });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Paid Plan Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 4000,
    installmentCount: 2,
  });

  const payment = await post("/fees/payments", {
    installmentId: plan.data.installments[0].id,
    amount: 2000,
  });
  assert.equal(payment.status, 201);

  const { status, data } = await patch(`/fees/plans/${plan.data.id}`, { totalAmount: 8000 });

  assert.equal(status, 400);
  assert.match(data.message, /collected payments/i);

  const stillThere = await get(`/fees/plans/${plan.data.id}`);
  assert.equal(stillThere.data.totalAmount, 4000);
});

test("PATCH /fees/plans/:id rejects unknown fields", async () => {
  const feeType = await post("/fees/types", { name: "Guard Fee", amount: 1000 });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Guard Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 1000,
  });

  const { status } = await patch(`/fees/plans/${plan.data.id}`, { status: "PAID" });

  assert.equal(status, 400);
});

test("PATCH /fees/receipts/:id updates notes and amount within the installment", async () => {
  const feeType = await post("/fees/types", { name: "Receipt Note Fee", amount: 2000 });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Receipt Note Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 2000,
  });
  const payment = await post("/fees/payments", {
    installmentId: plan.data.installments[0].id,
    amount: 2000,
  });
  assert.equal(payment.status, 201);

  const receipts = await get("/fees/receipts");
  const receipt = receipts.data.find((r) => r.number === payment.data.receipt.number);
  assert.ok(receipt);

  const { status, data } = await patch(`/fees/receipts/${receipt.id}`, {
    notes: "Paid by cheque 4471",
  });

  assert.equal(status, 200);
  assert.equal(data.notes, "Paid by cheque 4471");

  const adjusted = await patch(`/fees/receipts/${receipt.id}`, { amount: 1500 });
  assert.equal(adjusted.status, 200);
  assert.equal(adjusted.data.amount, 1500);

  const rejected = await patch(`/fees/receipts/${receipt.id}`, { amount: 5000 });
  assert.equal(rejected.status, 400);

  const empty = await patch(`/fees/receipts/${receipt.id}`, {});
  assert.equal(empty.status, 400);
});

test("PATCH /refunds/:id updates amount and reason within paid limits", async () => {
  const feeType = await post("/fees/types", { name: "Refund Edit Fee", amount: 5000 });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Refund Edit Student",
  });
  const plan = await post("/fees/plans", {
    studentId: student.data.id,
    feeTypeId: feeType.data.id,
    totalAmount: 5000,
  });
  await post("/fees/payments", { installmentId: plan.data.installments[0].id, amount: 5000 });

  const created = await post("/refunds", { studentId: student.data.id, amount: 1000 });
  assert.equal(created.status, 201);

  const { status, data } = await patch(`/refunds/${created.data.id}`, {
    amount: 2500,
    reason: "Class cancelled",
  });

  assert.equal(status, 200);
  assert.equal(data.amount, 2500);
  assert.equal(data.reason, "Class cancelled");

  const tooMuch = await patch(`/refunds/${created.data.id}`, { amount: 9000 });
  assert.equal(tooMuch.status, 400);
});

test("PATCH /salary-payments/:id updates period, amount and date", async () => {
  const staff = await post("/staff", {
    staffNo: `STF-${between(1000, 9999)}`,
    name: "Salary Edit Staff",
    salary: 40000,
  });
  assert.equal(staff.status, 201);

  const payment = await post("/salary-payments", {
    staffId: staff.data.id,
    periodMonth: "2026-01",
  });
  assert.equal(payment.status, 201);

  const { status, data } = await patch(`/salary-payments/${payment.data.id}`, {
    periodMonth: "2026-02",
    amount: 42500,
  });

  assert.equal(status, 200);
  assert.equal(data.periodMonth, "2026-02");
  assert.equal(data.amount, 42500);

  const badPeriod = await patch(`/salary-payments/${payment.data.id}`, {
    periodMonth: "2026-13",
  });
  assert.equal(badPeriod.status, 400);
});

test("PATCH /users/:id updates name, email and password without current password", async () => {
  const target = await postJson(baseUrl, "/users", {
    name: "Before Name",
    email: uniqueEmail("managed-target"),
    password: "password123",
  });
  const targetId = target.data.id;

  const newEmail = uniqueEmail("managed-updated");
  const { status, data } = await patch(`/users/${targetId}`, {
    name: "After Name",
    email: newEmail,
  });

  assert.equal(status, 200);
  assert.equal(data.name, "After Name");
  assert.equal(data.email, newEmail);
  assert.equal(data.password, undefined);

  const withPassword = await patch(`/users/${targetId}`, { password: "newpassword123" });
  assert.equal(withPassword.status, 200);

  const login = await postJson(baseUrl, "/users/login", {
    email: newEmail,
    password: "newpassword123",
  });
  assert.equal(login.status, 200);

  const oldLogin = await postJson(baseUrl, "/users/login", {
    email: newEmail,
    password: "password123",
  });
  assert.equal(oldLogin.status, 401);
});

test("PATCH /users/:id rejects protected fields and non-admins", async () => {
  const target = await postJson(baseUrl, "/users", {
    name: "Role Guard",
    email: uniqueEmail("role-guard"),
    password: "password123",
  });

  const roleAttempt = await patch(`/users/${target.data.id}`, { role: "ADMIN" });
  assert.equal(roleAttempt.status, 400);

  const shortPassword = await patch(`/users/${target.data.id}`, { password: "short" });
  assert.equal(shortPassword.status, 400);

  const nonAdmin = await patch(`/users/${target.data.id}`, { name: "Nope" }, financeToken);
  assert.equal(nonAdmin.status, 403);
});

test("PATCH /classes/:id/schedules/:scheduleId and materials/:materialId update in place", async () => {
  const classRecord = await post("/classes", { name: "Editable Class", teacherId });
  assert.equal(classRecord.status, 201);

  const schedule = await post(`/classes/${classRecord.data.id}/schedules`, {
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "09:00",
    room: "Room 101",
  });
  assert.equal(schedule.status, 201);

  const scheduleUpdate = await patch(
    `/classes/${classRecord.data.id}/schedules/${schedule.data.id}`,
    { startTime: "10:00", endTime: "11:30", room: "Room 202" },
  );

  assert.equal(scheduleUpdate.status, 200);
  assert.equal(scheduleUpdate.data.startTime.slice(0, 5), "10:00");
  assert.equal(scheduleUpdate.data.endTime.slice(0, 5), "11:30");
  assert.equal(scheduleUpdate.data.room, "Room 202");

  const badSchedule = await patch(
    `/classes/${classRecord.data.id}/schedules/${schedule.data.id}`,
    { startTime: "12:00", endTime: "11:00" },
  );
  assert.equal(badSchedule.status, 400);

  const material = await post(`/classes/${classRecord.data.id}/materials`, {
    title: "Notes",
    link: "https://example.com/notes.pdf",
  });
  assert.equal(material.status, 201);

  const materialUpdate = await patch(
    `/classes/${classRecord.data.id}/materials/${material.data.id}`,
    { title: "Updated Notes", description: "Week 1" },
  );

  assert.equal(materialUpdate.status, 200);
  assert.equal(materialUpdate.data.title, "Updated Notes");
  assert.equal(materialUpdate.data.description, "Week 1");

  const protectedField = await patch(
    `/classes/${classRecord.data.id}/materials/${material.data.id}`,
    { classId: 99 },
  );
  assert.equal(protectedField.status, 400);
});

test("PATCH /students/:id can move and clear a class", async () => {
  const firstClass = await post("/classes", { name: "Class One", teacherId });
  const secondClass = await post("/classes", { name: "Class Two", teacherId });
  const student = await post("/students", {
    admissionNo: `ADM-${between(1000, 9999)}`,
    name: "Class Move Student",
    classId: firstClass.data.id,
  });
  assert.equal(student.status, 201);

  const moved = await patch(`/students/${student.data.id}`, {
    classId: secondClass.data.id,
    guardianName: "New Guardian",
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.data.classId, secondClass.data.id);
  assert.equal(moved.data.guardianName, "New Guardian");

  const cleared = await patch(`/students/${student.data.id}`, { classId: null });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.data.classId, null);
});

test("classes carry a teacher and students surface their class teacher", async () => {
  const teacherReg = await postJson(baseUrl, "/users", {
    name: "Class Teacher",
    email: uniqueEmail("class-teacher"),
    password: "password123",
  });
  await prisma.user.update({
    where: { id: teacherReg.data.id },
    data: { role: "TEACHER" },
  });

  const classRes = await post("/classes", {
    name: "Grade 7",
    section: "B",
    teacherId: teacherReg.data.id,
  });
  assert.equal(classRes.status, 201);
  assert.equal(classRes.data.teacher.id, teacherReg.data.id);
  assert.equal(classRes.data.teacher.name, "Class Teacher");

  const studentRes = await post("/students", {
    admissionNo: `ADM-${Date.now()}`,
    name: "Class Student",
    classId: classRes.data.id,
  });
  assert.equal(studentRes.status, 201);
  assert.equal(studentRes.data.class.teacher.id, teacherReg.data.id);

  const list = await get("/students");
  const listed = list.data.find((item) => item.id === studentRes.data.id);
  assert.equal(listed.class.name, "Grade 7");
  assert.equal(listed.class.teacher.name, "Class Teacher");

  const detail = await get(`/students/${studentRes.data.id}`);
  assert.equal(detail.data.class.teacher.name, "Class Teacher");

  const reassigned = await patch(`/classes/${classRes.data.id}`, { teacherId: null });
  assert.equal(reassigned.status, 200);
  assert.equal(reassigned.data.teacher, null);

  const afterClear = await get(`/students/${studentRes.data.id}`);
  assert.equal(afterClear.data.class.teacher, null);
});

test("finance can list teachers and assign them to classes", async () => {
  const teachers = await get("/users/teachers", financeToken);
  assert.equal(teachers.status, 200);
  assert.ok(Array.isArray(teachers.data));
  teachers.data.forEach((teacher) => {
    assert.ok(teacher.id);
    assert.ok(teacher.name);
  });

  const teacherRes = await postJson(baseUrl, "/users", {
    name: "Finance Assigned Teacher",
    email: uniqueEmail("finance-teacher"),
    password: "password123",
  });
  await prisma.user.update({
    where: { id: teacherRes.data.id },
    data: { role: "TEACHER" },
  });

  const created = await postJson(
    baseUrl,
    "/classes",
    { name: "Finance Class", section: "A", teacherId: teacherRes.data.id },
    financeToken,
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.teacher.id, teacherRes.data.id);

  const patched = await patchJson(
    baseUrl,
    `/classes/${created.data.id}`,
    { section: "C" },
    financeToken,
  );
  assert.equal(patched.status, 200);
  assert.equal(patched.data.section, "C");
  assert.equal(patched.data.teacher.id, teacherRes.data.id);
});

test("classes reject accounts that are not teachers", async () => {
  const studentReg = await postJson(baseUrl, "/users", {
    name: "Not A Teacher",
    email: uniqueEmail("not-teacher"),
    password: "password123",
  });

  const { status, data } = await postJson(
    baseUrl,
    "/classes",
    { name: "Bad Teacher Class", teacherId: studentReg.data.id },
    adminToken,
  );

  assert.equal(status, 400);
  assert.match(data.message, /not a teacher/i);
});

test("teachers cannot read the teacher directory", async () => {
  const registration = await postJson(baseUrl, "/users", {
    name: "Directory Teacher",
    email: uniqueEmail("directory-teacher"),
    password: "password123",
  });
  await prisma.user.update({
    where: { id: registration.data.id },
    data: { role: "TEACHER" },
  });
  const login = await postJson(baseUrl, "/users/login", {
    email: registration.data.email,
    password: "password123",
  });

  const { status } = await get("/users/teachers", login.data.token);
  assert.equal(status, 403);

  const cleanup = await deleteJson(`/users/${registration.data.id}`);
  assert.equal(cleanup.status, 204);
});

test("avatar upload accepts a large base64 payload and rejects absurd ones", async () => {
  const target = await postJson(baseUrl, "/users", {
    name: "Avatar User",
    email: uniqueEmail("avatar"),
    password: "password123",
  });
  const login = await postJson(baseUrl, "/users/login", {
    email: target.data.email,
    password: "password123",
  });

  const largeAvatar = `data:image/jpeg;base64,${"A".repeat(1_200_000)}`;
  const ok = await patchJson(
    baseUrl,
    "/users/me",
    { avatarUrl: largeAvatar },
    login.data.token,
  );
  assert.equal(ok.status, 200);
  assert.equal(ok.data.avatarUrl, largeAvatar);

  const tooBig = await patchJson(
    baseUrl,
    "/users/me",
    { avatarUrl: "x".repeat(2_000_000) },
    login.data.token,
  );
  assert.equal(tooBig.status, 413);
  assert.match(tooBig.data.message, /too large/i);
});

test("PATCH /users/me accepts and clears a profile avatar", async () => {
  const target = await postJson(baseUrl, "/users", {
    name: "Avatar Clear",
    email: uniqueEmail("avatar-clear"),
    password: "password123",
  });
  const login = await postJson(baseUrl, "/users/login", {
    email: target.data.email,
    password: "password123",
  });

  const cleared = await patchJson(
    baseUrl,
    "/users/me",
    { name: "No Photo User", avatarUrl: null },
    login.data.token,
  );

  assert.equal(cleared.status, 200);
  assert.equal(cleared.data.avatarUrl, null);
  assert.equal(cleared.data.name, "No Photo User");
});

test("oversized JSON bodies return a helpful 413 message", async () => {
  const response = await fetch(`${baseUrl}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ avatarUrl: "y".repeat(4_000_000) }),
  });

  const data = await response.json();
  assert.equal(response.status, 413);
  assert.match(data.message, /too large/i);
});

test("teachers cannot use admin-only edit endpoints", async () => {
  const registration = await postJson(baseUrl, "/users", {
    name: "Edit Teacher",
    email: uniqueEmail("edit-teacher"),
    password: "password123",
  });
  await prisma.user.update({
    where: { id: registration.data.id },
    data: { role: "TEACHER" },
  });
  const login = await postJson(baseUrl, "/users/login", {
    email: registration.data.email,
    password: "password123",
  });
  const teacherToken = login.data.token;

  const target = await postJson(baseUrl, "/users", {
    name: "Teacher Target",
    email: uniqueEmail("teacher-target"),
    password: "password123",
  });

  const { status } = await patchJson(
    baseUrl,
    `/users/${target.data.id}`,
    { name: "Nope" },
    teacherToken,
  );
  assert.equal(status, 403);

  const cleanup = await deleteJson(`/users/${registration.data.id}`);
  assert.equal(cleanup.status, 204);
});
