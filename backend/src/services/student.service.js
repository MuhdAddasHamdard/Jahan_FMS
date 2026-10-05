import bcrypt from "bcrypt";
import prisma from "../prisma";
import { toNumber } from "../utils/money";
import { ROLES } from "../constants/roles";

const formatStudent = (student) => ({
  id: student.id,
  admissionNo: student.admissionNo,
  name: student.name,
  guardianName: student.guardianName,
  phone: student.phone,
  email: student.email,
  address: student.address,
  status: student.status,
  classId: student.classId,
  class: student.class
    ? {
        id: student.class.id,
        name: student.class.name,
        section: student.class.section,
      }
    : null,
  account: student.account
    ? { id: student.account.id, email: student.account.email }
    : null,
  createdAt: student.createdAt,
  updatedAt: student.updatedAt,
});

const formatInstallment = (installment) => ({
  id: installment.id,
  amount: toNumber(installment.amount),
  paidAmount: toNumber(installment.paidAmount),
  dueDate: installment.dueDate,
  paidAt: installment.paidAt,
  status: installment.status,
  receipt: installment.receipt
    ? {
        id: installment.receipt.id,
        number: installment.receipt.number,
        amount: toNumber(installment.receipt.amount),
        paidAt: installment.receipt.paidAt,
      }
    : null,
});

const formatFeePlan = (plan) => {
  const paidAmount = plan.installments.reduce(
    (sum, installment) => sum + toNumber(installment.paidAmount),
    0,
  );
  const totalAmount = toNumber(plan.totalAmount);
  const balance = totalAmount - paidAmount;
  const planStatus = balance <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING";

  return {
    id: plan.id,
    feeType: {
      id: plan.feeType.id,
      name: plan.feeType.name,
      amount: toNumber(plan.feeType.amount),
      period: plan.feeType.period,
    },
    totalAmount,
    installmentCount: plan.installmentCount,
    paidAmount,
    balance,
    status: planStatus,
    installments: plan.installments.map(formatInstallment),
  };
};

export const getAllStudents = async (userId, filters = {}) => {
  const { status, classId } = filters;

  const where = { userId };

  if (status) {
    where.status = status;
  }

  if (classId && !Number.isNaN(Number(classId))) {
    where.classId = Number(classId);
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      class: { select: { id: true, name: true, section: true } },
      account: { select: { id: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  return students.map(formatStudent);
};

export const getStudentById = async (userId, id, role) => {
  const isTeacher = role === ROLES.TEACHER;

  const student = await prisma.student.findFirst({
    where: { id: Number(id), userId },
    include: {
      class: { select: { id: true, name: true, section: true } },
      account: isTeacher
        ? false
        : { select: { id: true, email: true } },
      feePlans: isTeacher
        ? false
        : {
            include: {
              feeType: true,
              installments: {
                include: { receipt: true },
                orderBy: { dueDate: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
      refunds: isTeacher ? false : true,
    },
  });

  if (!student) {
    return null;
  }

  const refundedAmount = student.refunds
    ? student.refunds.reduce((sum, refund) => sum + toNumber(refund.amount), 0)
    : 0;

  if (isTeacher) {
    return formatStudent(student);
  }

  return {
    ...formatStudent(student),
    feePlans: student.feePlans.map(formatFeePlan),
    refunds: student.refunds.map((refund) => ({
      id: refund.id,
      amount: toNumber(refund.amount),
      reason: refund.reason,
      refundedOn: refund.refundedOn,
      createdAt: refund.createdAt,
    })),
    totalRefunded: refundedAmount,
  };
};

export const createStudent = async (userId, studentData) => {
  const student = await prisma.student.create({
    data: {
      admissionNo: studentData.admissionNo.trim(),
      name: studentData.name.trim(),
      guardianName: studentData.guardianName ?? null,
      phone: studentData.phone ?? null,
      email: studentData.email ?? null,
      address: studentData.address ?? null,
      status: studentData.status ?? "ACTIVE",
      classId: studentData.classId ? Number(studentData.classId) : null,
      userId,
    },
  });

  return formatStudent(student);
};

export const updateStudent = async (userId, id, studentData) => {
  const existing = await prisma.student.findFirst({
    where: { id: Number(id), userId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const student = await prisma.student.update({
    where: { id: Number(id) },
    data: {
      admissionNo: studentData.admissionNo ? String(studentData.admissionNo).trim() : undefined,
      name: studentData.name ? String(studentData.name).trim() : undefined,
      guardianName: studentData.guardianName,
      phone: studentData.phone,
      email: studentData.email,
      address: studentData.address,
      status: studentData.status,
      classId: studentData.clearClass
        ? null
        : studentData.classId !== undefined
          ? Number(studentData.classId)
          : undefined,
    },
    include: { class: { select: { id: true, name: true, section: true } } },
  });

  return formatStudent(student);
};

export const deleteStudent = async (userId, id) => {
  const existing = await prisma.student.findFirst({
    where: { id: Number(id), userId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  await prisma.student.delete({ where: { id: Number(id) } });

  return true;
};

export const getTotalPaidForStudent = async (userId, studentId) => {
  const installments = await prisma.feeInstallment.findMany({
    where: {
      userId,
      studentFee: { studentId: Number(studentId) },
      status: { not: "PENDING" },
    },
    select: { paidAmount: true },
  });

  return installments.reduce((sum, installment) => sum + toNumber(installment.paidAmount), 0);
};

export const linkStudentAccount = async (userId, studentId, accountData) => {
  const student = await prisma.student.findFirst({
    where: { id: Number(studentId), userId },
    select: { id: true, name: true, accountId: true },
  });

  if (!student) {
    return { error: "STUDENT_NOT_FOUND" };
  }

  if (student.accountId) {
    return { error: "STUDENT_ALREADY_LINKED" };
  }

  const hashedPassword = await bcrypt.hash(accountData.password, 10);

  const account = await prisma.user.create({
    data: {
      name: String(accountData.name || student.name).trim(),
      email: String(accountData.email).trim(),
      password: hashedPassword,
      role: ROLES.STUDENT,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  const updatedStudent = await prisma.student.update({
    where: { id: student.id },
    data: { accountId: account.id },
    include: { account: { select: { id: true, email: true } } },
  });

  return {
    user: account,
    student: {
      id: updatedStudent.id,
      admissionNo: updatedStudent.admissionNo,
      name: updatedStudent.name,
      account: updatedStudent.account,
    },
  };
};

export const unlinkStudentAccount = async (userId, studentId) => {
  const student = await prisma.student.findFirst({
    where: { id: Number(studentId), userId },
    select: { id: true, accountId: true },
  });

  if (!student) {
    return { error: "STUDENT_NOT_FOUND" };
  }

  if (!student.accountId) {
    return { error: "STUDENT_NOT_LINKED" };
  }

  await prisma.student.update({
    where: { id: student.id },
    data: { accountId: null },
  });

  return { id: student.id, unlinked: true };
};

export const getStudentPortal = async (userId) => {
  const student = await prisma.student.findFirst({
    where: { accountId: userId },
    include: {
      class: {
        include: {
          teacher: { select: { id: true, name: true, email: true } },
          schedules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
          materials: { orderBy: { createdAt: "desc" } },
        },
      },
      feePlans: {
        include: {
          feeType: true,
          installments: {
            include: { receipt: true },
            orderBy: { dueDate: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      refunds: true,
    },
  });

  if (!student) {
    return null;
  }

  const formattedPlans = student.feePlans.map(formatFeePlan);
  const paid = formattedPlans.reduce((sum, plan) => sum + plan.paidAmount, 0);
  const refunded = student.refunds.reduce((sum, refund) => sum + toNumber(refund.amount), 0);

  return {
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      name: student.name,
      guardianName: student.guardianName,
      phone: student.phone,
      email: student.email,
      address: student.address,
    },
    class: student.class
      ? {
          id: student.class.id,
          name: student.class.name,
          section: student.class.section,
          teacher: student.class.teacher
            ? {
                id: student.class.teacher.id,
                name: student.class.teacher.name,
                email: student.class.teacher.email,
              }
            : null,
          schedules: student.class.schedules.map((schedule) => ({
            id: schedule.id,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            room: schedule.room,
          })),
          materials: student.class.materials.map((material) => ({
            id: material.id,
            title: material.title,
            description: material.description,
            link: material.link,
            createdAt: material.createdAt,
          })),
        }
      : null,
    feePlans: formattedPlans,
    refunds: student.refunds.map((refund) => ({
      id: refund.id,
      amount: toNumber(refund.amount),
      reason: refund.reason,
      refundedOn: refund.refundedOn,
    })),
    totals: {
      totalPaid: paid,
      totalRefunded: refunded,
      outstandingDues: formattedPlans.reduce((sum, plan) => sum + plan.balance, 0),
    },
  };
};