import prisma from "../prisma";
import { toNumber } from "../utils/money";

const formatExpense = (expense) => ({
  id: expense.id,
  description: expense.description,
  amount: toNumber(expense.amount),
  paidOn: expense.paidOn,
  createdAt: expense.createdAt,
});

export const getExpenses = async (userId, filters = {}) => {
  const { from, to } = filters;

  const where = {};
  if (from || to) {
    where.paidOn = {};
    if (from) {
      where.paidOn.gte = new Date(from);
    }
    if (to) {
      where.paidOn.lte = new Date(to);
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { paidOn: "desc" },
  });

  return expenses.map(formatExpense);
};

export const getExpenseById = async (userId, id) => {
  const expense = await prisma.expense.findFirst({
    where: { id: Number(id) },
  });

  return expense ? formatExpense(expense) : null;
};

export const createExpense = async (userId, expenseData) => {
  const expense = await prisma.expense.create({
    data: {
      description: String(expenseData.description).trim(),
      amount: Number(expenseData.amount),
      paidOn: expenseData.paidOn ? new Date(expenseData.paidOn) : new Date(),
      userId,
    },
  });

  return formatExpense(expense);
};

export const updateExpense = async (userId, id, expenseData) => {
  const existing = await prisma.expense.findFirst({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const expense = await prisma.expense.update({
    where: { id: Number(id) },
    data: {
      description:
        expenseData.description
          ? String(expenseData.description).trim()
          : undefined,
      amount: expenseData.amount !== undefined ? Number(expenseData.amount) : undefined,
      paidOn: expenseData.paidOn ? new Date(expenseData.paidOn) : undefined,
    },
  });

  return formatExpense(expense);
};

export const deleteExpense = async (userId, id) => {
  const existing = await prisma.expense.findFirst({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  await prisma.expense.delete({ where: { id: Number(id) } });

  return true;
};