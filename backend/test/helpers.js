import app from "../src/app";
import prisma from "../src/prisma";
import { createUserService } from "../src/services/user.service";

const databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (!/(?:^|[-_])test(?:[-_]|$)/i.test(databaseName)) {
  throw new Error("Integration tests require a dedicated PostgreSQL database with 'test' in its name.");
}

export const startServer = async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
  };
};

export const postJson = async (baseUrl, path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
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

export const getJson = async (baseUrl, path, token) => {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
};

export const between = (min, max) => Math.floor(Math.random() * (max - min)) + min;

export const patchJson = async (baseUrl, path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers,
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

export const uniqueEmail = (prefix) =>
  `${prefix}.${Date.now()}.${between(1000, 9999)}@example.com`;

export const createTestUser = async (userData) => ({
  status: 201,
  data: await createUserService(userData),
});

// Institute data is shared between ADMIN and FINANCE, so every test file must
// leave no @example.com users behind or the next run inherits their records.
export const cleanupTestUsers = async () => {
  await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({ where: { email: { endsWith: "@example.com" } }, select: { id: true } });
    const ids = users.map(({ id }) => id);
    if (!ids.length) return;
    const owned = { where: { userId: { in: ids } } };
    await tx.expense.deleteMany(owned);
    await tx.refund.deleteMany(owned);
    await tx.receipt.deleteMany(owned);
    await tx.feeInstallment.deleteMany(owned);
    await tx.studentFee.deleteMany(owned);
    await tx.feeType.deleteMany(owned);
    await tx.student.deleteMany(owned);
    await tx.salaryPayment.deleteMany(owned);
    await tx.staffSalary.deleteMany(owned);
    await tx.staff.deleteMany(owned);
    await tx.classSchedule.deleteMany(owned);
    await tx.courseMaterial.deleteMany(owned);
    await tx.class.deleteMany(owned);
    await tx.syncMutation.deleteMany({ where: { actorId: { in: ids } } });
    await tx.user.deleteMany({ where: { id: { in: ids } } });
  });
};
