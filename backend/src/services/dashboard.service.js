import prisma from "../prisma";
import { toNumber } from "../utils/money";
import { INSTALLMENT_STATUSES } from "../constants/fee";
import { ROLES } from "../constants/roles";
import { classScope, studentScope } from "../utils/scope";

const monthWindow = () => {
  const now = new Date();
  return {
    startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
};

const computeOpenDues = async (scope) => {
  const studentWhere = scope.userId
    ? { studentFee: { student: { userId: scope.userId } } }
    : {};

  const openInstallments = await prisma.feeInstallment.findMany({
    where: {
      ...studentWhere,
      status: { in: [INSTALLMENT_STATUSES[0], INSTALLMENT_STATUSES[1]] },
    },
    select: {
      amount: true,
      paidAmount: true,
      studentFee: {
        select: {
          student: { select: { id: true } },
        },
      },
    },
  });

  let outstandingDues = 0;
  const studentsWithDues = new Set();
  for (const installment of openInstallments) {
    const remaining = toNumber(installment.amount) - toNumber(installment.paidAmount);
    if (remaining > 0) {
      outstandingDues += remaining;
      const studentId = installment.studentFee?.student?.id;
      if (studentId) studentsWithDues.add(studentId);
    }
  }

  return { outstandingDues, studentsWithDues: studentsWithDues.size };
};

const buildSummary = async (scope) => {
  const { startOfMonth, endOfMonth } = monthWindow();

  const [
    monthFee,
    monthRefund,
    monthSalary,
    monthExpense,
    totalFee,
    totalRefund,
    totalSalary,
    totalExpense,
    openDues,
    studentCount,
    classCount,
    feeTypeCount,
    recentReceipts,
  ] = await Promise.all([
    prisma.receipt.aggregate({
      where: { ...scope, paidAt: { gte: startOfMonth, lt: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({
      where: { ...scope, refundedOn: { gte: startOfMonth, lt: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.salaryPayment.aggregate({
      where: { ...scope, paidOn: { gte: startOfMonth, lt: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...scope, paidOn: { gte: startOfMonth, lt: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.receipt.aggregate({ where: scope, _sum: { amount: true } }),
    prisma.refund.aggregate({ where: scope, _sum: { amount: true } }),
    prisma.salaryPayment.aggregate({ where: scope, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: scope, _sum: { amount: true } }),
    computeOpenDues(scope),
    prisma.student.count({ where: scope }),
    prisma.class.count({ where: scope }),
    prisma.feeType.count({ where: scope }),
    prisma.receipt.findMany({
      where: scope,
      orderBy: { paidAt: "desc" },
      take: 5,
      include: {
        installments: {
          include: {
            studentFee: {
              include: {
                student: { select: { id: true, admissionNo: true, name: true } },
                feeType: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const monthlyFeeCollected = toNumber(monthFee._sum.amount) ?? 0;
  const monthlyRefunds = toNumber(monthRefund._sum.amount) ?? 0;
  const monthlySalaries = toNumber(monthSalary._sum.amount) ?? 0;
  const monthlyExpenses = toNumber(monthExpense._sum.amount) ?? 0;

  return {
    monthlyFeeCollected,
    monthlyRefunds,
    monthlySalaries,
    monthlyExpenses,
    monthlyNet: monthlyFeeCollected - monthlyRefunds - monthlySalaries - monthlyExpenses,
    feeCollected: toNumber(totalFee._sum.amount) ?? 0,
    refunded: toNumber(totalRefund._sum.amount) ?? 0,
    salariesPaid: toNumber(totalSalary._sum.amount) ?? 0,
    expenses: toNumber(totalExpense._sum.amount) ?? 0,
    outstandingDues: openDues.outstandingDues,
    studentsWithDues: openDues.studentsWithDues,
    studentCount,
    classCount,
    feeTypeCount,
    recentReceipts: recentReceipts.map((receipt) => ({
      id: receipt.id,
      number: receipt.number,
      amount: toNumber(receipt.amount),
      paidAt: receipt.paidAt,
      student: receipt.installments[0]?.studentFee.student ?? null,
      feeType: receipt.installments[0]?.studentFee.feeType ?? null,
    })),
    period: {
      from: startOfMonth,
      to: endOfMonth,
    },
  };
};

export const getDashboardSummary = async () => {
  return buildSummary({});
};

export const getAdminDashboardSummary = async () => {
  const [summary, totalUsers] = await Promise.all([
    buildSummary({}),
    prisma.user.count(),
  ]);

  return {
    ...summary,
    totalUsers,
  };
};

export const getTeacherDashboard = async (userId) => {
  const scope = classScope(ROLES.TEACHER, userId);
  const [classCount, studentCount, materialCount, classes] = await Promise.all([
    prisma.class.count({ where: scope }),
    prisma.student.count({ where: studentScope(ROLES.TEACHER, userId) }),
    prisma.courseMaterial.count({ where: { class: scope } }),
    prisma.class.findMany({
      where: scope,
      include: {
        _count: { select: { students: true } },
        teacher: { select: { id: true, name: true, email: true } },
        materials: {
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    classCount,
    studentCount,
    materialCount,
    classes: classes.map((classRecord) => ({
      id: classRecord.id,
      name: classRecord.name,
      section: classRecord.section,
      teacher: classRecord.teacher
        ? {
            id: classRecord.teacher.id,
            name: classRecord.teacher.name,
            email: classRecord.teacher.email,
          }
        : null,
      studentCount: classRecord._count.students,
      materials: classRecord.materials.map((material) => ({
        id: material.id,
        title: material.title,
        createdAt: material.createdAt,
      })),
    })),
  };
};