import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import prisma from "../prisma";
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