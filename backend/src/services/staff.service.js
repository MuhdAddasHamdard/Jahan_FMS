import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import prisma from "../prisma";
import { toNumber } from "../utils/money";
import { ROLES } from "../constants/roles";

// A staff member with the TEACHER designation should be pickable as a class
// teacher, which requires a matching login account. Create one when an email is
// given. The admin sets the password later from User management.
const ensureTeacherAccount = async ({ name, designation, email }) => {
  if (designation !== "TEACHER") {
    return null;
  }

  const normalizedEmail = email ? String(email).trim() : "";
  if (!normalizedEmail) {
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const password = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      role: ROLES.TEACHER,
      password,
    },
    select: { id: true },
  });

  return user.id;
};

const formatStaff = (staff) => ({
  id: staff.id,
  staffNo: staff.staffNo,
  name: staff.name,
  designation: staff.designation,
  phone: staff.phone,
  email: staff.email,
  salary: toNumber(staff.salary),
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

export const getAllStaff = async (userId) => {
  const staff = await prisma.staff.findMany({
    where: {},
    orderBy: { name: "asc" },
  });

  return staff.map(formatStaff);
};

export const getStaffById = async (userId, id) => {
  const staff = await prisma.staff.findFirst({
    where: { id: Number(id) },
  });

  return staff ? formatStaff(staff) : null;
};

export const createStaff = async (userId, staffData) => {
  const staff = await prisma.staff.create({
    data: {
      staffNo: String(staffData.staffNo).trim(),
      name: String(staffData.name).trim(),
      designation: staffData.designation ?? "TEACHER",
      phone: staffData.phone ?? null,
      email: staffData.email ?? null,
      salary: staffData.salary ?? 0,
      userId,
    },
  });

  try {
    await ensureTeacherAccount(staff);
  } catch (error) {
    console.error("Could not create a login for this teacher:", error);
  }

  return formatStaff(staff);
};

export const updateStaff = async (userId, id, staffData) => {
  const existing = await prisma.staff.findFirst({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const staff = await prisma.staff.update({
    where: { id: Number(id) },
    data: {
      staffNo: staffData.staffNo ? String(staffData.staffNo).trim() : undefined,
      name: staffData.name ? String(staffData.name).trim() : undefined,
      designation: staffData.designation,
      phone: staffData.phone,
      email: staffData.email,
      salary: staffData.salary !== undefined ? Number(staffData.salary) : undefined,
    },
  });

  try {
    await ensureTeacherAccount(staff);
  } catch (error) {
    console.error("Could not create a login for this teacher:", error);
  }

  return formatStaff(staff);
};

export const deleteStaff = async (userId, id) => {
  const existing = await prisma.staff.findFirst({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const paymentCount = await prisma.salaryPayment.count({
    where: { staffId: Number(id) },
  });

  if (paymentCount > 0) {
    return { error: "STAFF_HAS_PAYMENTS" };
  }

  await prisma.staff.delete({ where: { id: Number(id) } });

  return true;
};

export const getSalaryPayments = async (userId, filters = {}) => {
  const { staffId } = filters;

  const where = {};

  if (staffId && !Number.isNaN(Number(staffId))) {
    where.staffId = Number(staffId);
  }

  const payments = await prisma.salaryPayment.findMany({
    where,
    include: {
      staff: { select: { id: true, staffNo: true, name: true, designation: true } },
    },
    orderBy: { paidOn: "desc" },
  });

  return payments.map((payment) => ({
    id: payment.id,
    staff: payment.staff,
    amount: toNumber(payment.amount),
    periodMonth: payment.periodMonth,
    paidOn: payment.paidOn,
    notes: payment.notes,
    createdAt: payment.createdAt,
  }));
};

export const createSalaryPayment = async (
  userId,
  { staffId, periodMonth, amount, paidOn, notes },
) => {
  return prisma.$transaction(async (tx) => {
    const staff = await tx.staff.findFirst({
      where: { id: Number(staffId) },
      select: { id: true, name: true, staffNo: true, salary: true },
    });

    if (!staff) {
      return { error: "STAFF_NOT_FOUND" };
    }

    const existing = await tx.salaryPayment.findFirst({
      where: { staffId: staff.id, periodMonth },
      select: { id: true },
    });

    if (existing) {
      return { error: "ALREADY_PAID" };
    }

    const payAmount = amount !== undefined ? Number(amount) : Number(staff.salary);
    const paidOnDate = paidOn ? new Date(paidOn) : new Date();

    const payment = await tx.salaryPayment.create({
      data: {
        staffId: staff.id,
        amount: payAmount,
        periodMonth,
        paidOn: paidOnDate,
        notes: notes ?? null,
        userId,
      },
      include: {
        staff: { select: { id: true, staffNo: true, name: true } },
      },
    });

    return {
      id: payment.id,
      staff: payment.staff,
      amount: toNumber(payment.amount),
      periodMonth: payment.periodMonth,
      paidOn: payment.paidOn,
    };
  });
};

export const updateSalaryPayment = async (userId, id, { periodMonth, amount, paidOn }) => {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.salaryPayment.findFirst({
      where: { id: Number(id) },
      select: { id: true, staffId: true },
    });

    if (!payment) {
      return null;
    }

    if (periodMonth !== undefined) {
      const clash = await tx.salaryPayment.findFirst({
        where: { staffId: payment.staffId, periodMonth, id: { not: payment.id } },
        select: { id: true },
      });

      if (clash) {
        return { error: "ALREADY_PAID" };
      }
    }

    const updated = await tx.salaryPayment.update({
      where: { id: payment.id },
      data: {
        periodMonth,
        amount: amount !== undefined ? Number(amount) : undefined,
        paidOn: paidOn ? new Date(paidOn) : undefined,
      },
      include: {
        staff: { select: { id: true, staffNo: true, name: true } },
      },
    });

    return {
      id: updated.id,
      staff: updated.staff,
      amount: toNumber(updated.amount),
      periodMonth: updated.periodMonth,
      paidOn: updated.paidOn,
    };
  });
};

export const deleteSalaryPayment = async (userId, id) => {
  const payment = await prisma.salaryPayment.findFirst({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!payment) {
    return null;
  }

  await prisma.salaryPayment.delete({ where: { id: payment.id } });

  return true;
};