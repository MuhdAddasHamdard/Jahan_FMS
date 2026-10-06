import prisma from "../prisma";
import { toNumber } from "../utils/money";
import { INSTALLMENT_STATUSES } from "../constants/fee";

const buildDateWhere = (from, to) => {
  const where = {};
  if (from) {
    where.gte = new Date(from);
  }
  if (to) {
    where.lte = new Date(to);
  }
  return where;
};

const rangeWhere = (from, to) => {
  const where = {};
  if (from || to) {
    where.gte = from ? new Date(from) : undefined;
    where.lte = to ? new Date(to) : undefined;
  }
  return Object.keys(where).length ? where : undefined;
};

const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const getReportSummary = async (userId, { from, to } = {}) => {
  const dateWhere = rangeWhere(from, to);

  const [receipts, refunds, salaryPayments, expenses] = await Promise.all([
    prisma.receipt.findMany({
      where: { paidAt: dateWhere },
      select: { amount: true, paidAt: true },
    }),
    prisma.refund.findMany({
      where: { refundedOn: dateWhere },
      select: { amount: true, refundedOn: true },
    }),
    prisma.salaryPayment.findMany({
      where: { paidOn: dateWhere },
      select: { amount: true, paidOn: true },
    }),
    prisma.expense.findMany({
      where: { paidOn: dateWhere },
      select: { amount: true, paidOn: true },
    }),
  ]);

  const totalIncome = receipts.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const totalRefunds = refunds.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const totalSalaries = salaryPayments.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const totalExpense = totalRefunds + totalSalaries + totalExpenses;

  const byMonth = new Map();
  const addRow = (month, income, expense) => {
    const entry = byMonth.get(month) ?? { month, income: 0, expense: 0 };
    entry.income += income;
    entry.expense += expense;
    byMonth.set(month, entry);
  };

  for (const receipt of receipts) {
    addRow(monthKey(receipt.paidAt), toNumber(receipt.amount), 0);
  }
  for (const refund of refunds) {
    addRow(monthKey(refund.refundedOn), 0, toNumber(refund.amount));
  }
  for (const payment of salaryPayments) {
    addRow(monthKey(payment.paidOn), 0, toNumber(payment.amount));
  }
  for (const expense of expenses) {
    addRow(monthKey(expense.paidOn), 0, toNumber(expense.amount));
  }

  return {
    period: {
      from: from ?? null,
      to: to ?? null,
    },
    totals: {
      totalIncome,
      totalRefunds,
      totalSalaries,
      totalExpenses,
      totalExpense,
      net: totalIncome - totalExpense,
      feeCount: receipts.length,
    },
    byMonth: [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1)),
  };
};

export const getInstituteReport = async (userId, { from, to } = {}) => {
  const paidWhere = {};
  const refundedWhere = {};
  const salaryWhere = {};
  const expenseWhere = {};

  if (from || to) {
    paidWhere.paidAt = buildDateWhere(from, to);
    refundedWhere.refundedOn = buildDateWhere(from, to);
    salaryWhere.paidOn = buildDateWhere(from, to);
    expenseWhere.paidOn = buildDateWhere(from, to);
  }

  const [feeAgg, feeCount, refundAgg, refundCount, salaryAgg, salaryCount, expenseAgg, expenseCount, openInstallments] =
    await Promise.all([
      prisma.receipt.aggregate({
        where: paidWhere,
        _sum: { amount: true },
      }),
      prisma.receipt.count({ where: paidWhere }),
      prisma.refund.aggregate({
        where: refundedWhere,
        _sum: { amount: true },
      }),
      prisma.refund.count({ where: refundedWhere }),
      prisma.salaryPayment.aggregate({
        where: salaryWhere,
        _sum: { amount: true },
      }),
      prisma.salaryPayment.count({ where: salaryWhere }),
      prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      }),
      prisma.expense.count({ where: expenseWhere }),
      prisma.feeInstallment.findMany({
        where: {
          status: {
            in: [INSTALLMENT_STATUSES[0], INSTALLMENT_STATUSES[1]],
          },
        },
        select: {
          amount: true,
          paidAmount: true,
          studentFee: {
            select: {
              student: {
                select: { id: true, name: true, admissionNo: true },
              },
            },
          },
        },
      }),
    ]);

  let outstandingDues = 0;
  const studentsWithDues = new Set();
  for (const installment of openInstallments) {
    const remaining = toNumber(installment.amount) - toNumber(installment.paidAmount);
    if (remaining > 0) {
      outstandingDues += remaining;
      studentsWithDues.add(installment.studentFee.student.id);
    }
  }

  const feeCollected = toNumber(feeAgg._sum.amount) ?? 0;
  const refunded = toNumber(refundAgg._sum.amount) ?? 0;
  const salariesPaid = toNumber(salaryAgg._sum.amount) ?? 0;
  const expenses = toNumber(expenseAgg._sum.amount) ?? 0;

  return {
    period: {
      from: from ?? null,
      to: to ?? null,
    },
    totals: {
      feeCollected,
      feeCount: feeCount,
      refunded,
      refundCount: refundCount,
      netCollected: feeCollected - refunded,
      salariesPaid,
      salaryCount: salaryCount,
      expenses,
      expenseCount: expenseCount,
      outstandingDues,
      studentsWithDues: studentsWithDues.size,
      netResult: feeCollected - refunded - salariesPaid - expenses,
    },
  };
};