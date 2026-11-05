import prisma from "../prisma";
import { toNumber } from "../utils/money";

const staffSelection = { id: true, staffNo: true, name: true, designation: true };

const formatSalaryRate = (rate) => ({
  id: rate.id,
  staff: rate.staff,
  amount: toNumber(rate.amount),
  effectiveFrom: rate.effectiveFrom,
  createdAt: rate.createdAt,
});

export const getSalaryRates = async () => {
  const rates = await prisma.staffSalary.findMany({
    include: { staff: { select: staffSelection } },
    orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
  });
  return rates.map(formatSalaryRate);
};

export const createSalaryRate = async (userId, { staffId, amount, effectiveFrom }) => {
  const staff = await prisma.staff.findFirst({
    where: { id: Number(staffId) },
    select: { id: true },
  });
  if (!staff) {
    return { error: "STAFF_NOT_FOUND" };
  }

  const rate = await prisma.staffSalary.create({
    data: {
      staffId: staff.id,
      amount: Number(amount),
      effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
      userId,
    },
    include: { staff: { select: staffSelection } },
  });
  return formatSalaryRate(rate);
};

export const updateSalaryRate = async (id, { amount, effectiveFrom }) => {
  const existing = await prisma.staffSalary.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });
  if (!existing) {
    return null;
  }

  const rate = await prisma.staffSalary.update({
    where: { id: existing.id },
    data: {
      amount: amount !== undefined ? Number(amount) : undefined,
      effectiveFrom: effectiveFrom
        ? new Date(`${effectiveFrom}T00:00:00.000Z`)
        : undefined,
    },
    include: { staff: { select: staffSelection } },
  });
  return formatSalaryRate(rate);
};

export const deleteSalaryRate = async (id) => {
  const existing = await prisma.staffSalary.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });
  if (!existing) {
    return null;
  }
  await prisma.staffSalary.delete({ where: { id: existing.id } });
  return true;
};

export const getSalaryPayments = async (filters = {}) => {
  const where = {};
  if (filters.staffId && !Number.isNaN(Number(filters.staffId))) {
    where.staffId = Number(filters.staffId);
  }

  const payments = await prisma.salaryPayment.findMany({
    where,
    include: { staff: { select: staffSelection } },
    orderBy: [{ paidOn: "desc" }, { id: "desc" }],
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
) =>
  prisma.$transaction(async (tx) => {
    const staff = await tx.staff.findFirst({
      where: { id: Number(staffId) },
      select: { id: true, name: true, staffNo: true },
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

    let payAmount = amount === undefined ? undefined : Number(amount);
    if (payAmount === undefined) {
      const periodStart = new Date(`${periodMonth}-01T00:00:00.000Z`);
      const rate = await tx.staffSalary.findFirst({
        where: { staffId: staff.id, effectiveFrom: { lte: periodStart } },
        orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
        select: { amount: true },
      });
      if (!rate) {
        return { error: "SALARY_RATE_NOT_FOUND" };
      }
      payAmount = Number(rate.amount);
    }

    const payment = await tx.salaryPayment.create({
      data: {
        staffId: staff.id,
        amount: payAmount,
        periodMonth,
        paidOn: paidOn ? new Date(paidOn) : new Date(),
        notes: notes ?? null,
        userId,
      },
      include: { staff: { select: { id: true, staffNo: true, name: true } } },
    });

    return {
      id: payment.id,
      staff: payment.staff,
      amount: toNumber(payment.amount),
      periodMonth: payment.periodMonth,
      paidOn: payment.paidOn,
    };
  });

export const updateSalaryPayment = async (id, { periodMonth, amount, paidOn }) =>
  prisma.$transaction(async (tx) => {
    const payment = await tx.salaryPayment.findUnique({
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
      include: { staff: { select: { id: true, staffNo: true, name: true } } },
    });

    return {
      id: updated.id,
      staff: updated.staff,
      amount: toNumber(updated.amount),
      periodMonth: updated.periodMonth,
      paidOn: updated.paidOn,
    };
  });

export const deleteSalaryPayment = async (id) => {
  const payment = await prisma.salaryPayment.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });
  if (!payment) {
    return null;
  }
  await prisma.salaryPayment.delete({ where: { id: payment.id } });
  return true;
};
