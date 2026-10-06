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
let teacherId;

const patchJson = async (path, body, tokenValue = token) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenValue}`,
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

const deleteJson = async (path, tokenValue = token) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenValue}` },
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
    name: "Class Admin",
    email: uniqueEmail("class-user"),
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

  const teacher = await postJson(baseUrl, "/users", {
    name: "Ms. Mentor",
    email: uniqueEmail("class-teacher"),
    password: "password123",
  });
  await prisma.user.update({
    where: { id: teacher.data.id },
    data: { role: "TEACHER" },
  });
  teacherId = teacher.data.id;
});

after(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await cleanupTestUsers();
  await new Promise((resolve) => server.close(resolve));
});

test("POST /classes creates a class", async () => {
  const { status, data } = await postJson(baseUrl, "/classes", { name: "Grade 7", section: "A" }, token);

  assert.equal(status, 201);
  assert.equal(data.name, "Grade 7");
  assert.equal(data.section, "A");
  assert.equal(data.studentCount, 0);

  await prisma.class.delete({ where: { id: data.id } });
});

test("POST /classes requires a name", async () => {
  const { status } = await postJson(baseUrl, "/classes", { section: "A" }, token);
  assert.equal(status, 400);
});

test("PATCH /classes updates a class", async () => {
  const created = await postJson(baseUrl, "/classes", { name: "Grade 8" }, token);
  const { status, data } = await patchJson(`/classes/${created.data.id}`, { name: "Grade 9", section: "B" });

  assert.equal(status, 200);
  assert.equal(data.name, "Grade 9");
  assert.equal(data.section, "B");

  await prisma.class.delete({ where: { id: created.data.id } });
});

test("GET /classes lists classes with student counts", async () => {
  const created = await postJson(baseUrl, "/classes", { name: "Grade 10" }, token);
  const student = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Student One", classId: created.data.id },
    token,
  );

  const { status, data } = await getJson(baseUrl, "/classes", token);
  assert.equal(status, 200);
  const found = data.find((c) => c.id === created.data.id);
  assert.ok(found);
  assert.equal(found.studentCount, 1);

  await prisma.student.delete({ where: { id: student.data.id } });
  await prisma.class.delete({ where: { id: created.data.id } });
});

test("DELETE /classes removes the class", async () => {
  const created = await postJson(baseUrl, "/classes", { name: "Grade 11" }, token);
  const { status } = await deleteJson(`/classes/${created.data.id}`);
  assert.equal(status, 204);

  const gone = await prisma.class.findUnique({ where: { id: created.data.id } });
  assert.equal(gone, null);
});

test("deleting a class detaches students without deleting them", async () => {
  const created = await postJson(baseUrl, "/classes", { name: "Grade 12" }, token);
  const { data: student } = await postJson(
    baseUrl,
    "/students",
    { admissionNo: `ADM-${between(1000, 9999)}`, name: "Detach Me", classId: created.data.id },
    token,
  );

  await deleteJson(`/classes/${created.data.id}`);

  const afterDelete = await prisma.student.findUnique({ where: { id: student.id } });
  assert.equal(afterDelete.classId, null);

  await prisma.student.delete({ where: { id: student.id } });
});

test("POST /classes assigns a teacher", async () => {
  const { status, data } = await postJson(
    baseUrl,
    "/classes",
    { name: "Grade 13", section: "A", teacherId },
    token,
  );

  assert.equal(status, 201);
  assert.equal(data.teacher.id, teacherId);

  await prisma.class.delete({ where: { id: data.id } });
});

test("PATCH /classes can change or clear the teacher", async () => {
  const created = await postJson(
    baseUrl,
    "/classes",
    { name: "Grade 14", teacherId },
    token,
  );

  const changed = await patchJson(`/classes/${created.data.id}`, { teacherId: null });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.teacher, null);

  await prisma.class.delete({ where: { id: created.data.id } });
});

test("class schedules can be created, listed and deleted", async () => {
  const { data: cls } = await postJson(baseUrl, "/classes", { name: "Scheduled Grade" }, token);

  const created = await postJson(
    baseUrl,
    `/classes/${cls.id}/schedules`,
    { dayOfWeek: 1, startTime: "08:00", endTime: "09:30", room: "Lab 1" },
    token,
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.dayOfWeek, 1);
  assert.equal(created.data.room, "Lab 1");

  const listed = await getJson(baseUrl, `/classes/${cls.id}/schedules`, token);
  assert.equal(listed.status, 200);
  assert.equal(listed.data.length, 1);

  const deleted = await deleteJson(`/classes/${cls.id}/schedules/${created.data.id}`);
  assert.equal(deleted.status, 204);

  const afterDelete = await getJson(baseUrl, `/classes/${cls.id}/schedules`, token);
  assert.equal(afterDelete.data.length, 0);

  await prisma.class.delete({ where: { id: cls.id } });
});

test("invalid schedules are rejected", async () => {
  const { data: cls } = await postJson(baseUrl, "/classes", { name: "Strict Grade" }, token);

  const badDay = await postJson(
    baseUrl,
    `/classes/${cls.id}/schedules`,
    { dayOfWeek: 9, startTime: "08:00", endTime: "09:30" },
    token,
  );
  assert.equal(badDay.status, 400);

  const badTime = await postJson(
    baseUrl,
    `/classes/${cls.id}/schedules`,
    { dayOfWeek: 0, startTime: "8 AM", endTime: "09:30" },
    token,
  );
  assert.equal(badTime.status, 400);

  await prisma.class.delete({ where: { id: cls.id } });
});

test("course materials can be added, listed and removed", async () => {
  const { data: cls } = await postJson(baseUrl, "/classes", { name: "Materiel Grade" }, token);

  const created = await postJson(
    baseUrl,
    `/classes/${cls.id}/materials`,
    { title: "Syllabus", description: "Year outline", link: "https://example.com/syllabus" },
    token,
  );
  assert.equal(created.status, 201);
  assert.equal(created.data.title, "Syllabus");

  const listed = await getJson(baseUrl, `/classes/${cls.id}/materials`, token);
  assert.equal(listed.status, 200);
  assert.equal(listed.data.length, 1);

  const deleted = await deleteJson(`/classes/${cls.id}/materials/${created.data.id}`);
  assert.equal(deleted.status, 204);

  const afterDelete = await getJson(baseUrl, `/classes/${cls.id}/materials`, token);
  assert.equal(afterDelete.data.length, 0);

  await prisma.class.delete({ where: { id: cls.id } });
});

test("class detail includes schedules and materials", async () => {
  const { data: cls } = await postJson(baseUrl, "/classes", { name: "Detail Grade" }, token);

  await postJson(
    baseUrl,
    `/classes/${cls.id}/schedules`,
    { dayOfWeek: 2, startTime: "10:00", endTime: "11:00" },
    token,
  );
  await postJson(
    baseUrl,
    `/classes/${cls.id}/materials`,
    { title: "Notes 1" },
    token,
  );

  const detail = await getJson(baseUrl, `/classes/${cls.id}`, token);
  assert.equal(detail.status, 200);
  assert.equal(detail.data.schedules.length, 1);
  assert.equal(detail.data.materials.length, 1);
  assert.ok(Array.isArray(detail.data.students));

  await prisma.class.delete({ where: { id: cls.id } });
});