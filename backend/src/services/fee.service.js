import prisma from "../prisma";
import { toNumber } from "../utils/money";
import { randomUUID } from "node:crypto";

const formatFeeType = (feeType) => ({
  id: feeType.id,
  name: feeType.name,
  amount: toNumber(feeType.amount),
  period: feeType.period,
  createdAt: feeType.createdAt,
  updatedAt: feeType.updatedAt,
});

const formatInstallment = (installment) => ({
  id: installment.id,
  amount: toNumber(installment.amount),
  paidAmount: toNumber(installment.paidAmount),
  dueDate: installment.dueDate,
  paidAt: installment.paidAt,
  status: installment.status,
});

const installmentsFor = (totalAmount, installmentCount) => {
  const count = Math.max(1, Number(installmentCount) || 1);

  if (count === 1) {
    return [{ amount: totalAmount, dueDate: new Date() }];
  }

  const perInstallment = Math.round(totalAmount * 100) / 100 / count;
  const base = Math.round(perInstallment * 100) / 100;
  const last = Math.round((totalAmount - base * (count - 1)) * 100) / 100;

  const amounts = Array.from({ length: count }, (_, index) =>
    index === count - 1 ? last : base,
  );

  const now = new Date();
  return amounts.map((amount, index) => {
    const dueDate = new Date(now.getFullYear(), now.getMonth() + index, 1);
    return { amount, dueDate };
  });
};

export const getAllFeeTypes = async (userId) => {
  const feeTypes = await prisma.feeType.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return feeTypes.map(formatFeeType);
};

export const getFeeTypeById = async (userId, id) => {
  const feeType = await prisma.feeType.findFirst({
    where: { id: Number(id), userId },
  });

  return feeType ? formatFeeType(feeType) : null;
};

export const createFeeType = async (userId, feeTypeData) => {
  const feeType = await prisma.feeType.create({
    data: {
      name: feeTypeData.name.trim(),
      amount: feeTypeData.amount ?? 0,
      period: feeTypeData.period ?? "MONTHLY",
      userId,
    },
  });

  return formatFeeType(feeType);
};

export const updateFeeType = async (userId, id, feeTypeData) => {
  const existing = await prisma.feeType.findFirst({
    where: { id: Number(id), userId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const feeType = await prisma.feeType.update({
    where: { id: Number(id) },
    data: {
      name: feeTypeData.name ? String(feeTypeData.name).trim() : undefined,
      amount: feeTypeData.amount !== undefined ? Number(feeTypeData.amount) : undefined,
      period: feeTypeData.period,
    },
  });

  return formatFeeType(feeType);
};

export const deleteFeeType = async (userId, id) => {
  const existing = await prisma.feeType.findFirst({
    where: { id: Number(id), userId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const planCount = await prisma.studentFee.count({
    where: { userId, feeTypeId: Number(id) },
  });

  if (planCount > 0) {
    return { error: "FEETYPE_HAS_PLANS" };
  }

  await prisma.feeType.delete({ where: { id: Number(id) } });

  return true;
};

export const getAllFeePlans = async (userId) => {
  const plans = await prisma.studentFee.findMany({
    where: { userId },
    include: {
      student: { select: { id: true, admissionNo: true, name: true } },
      feeType: { select: { id: true, name: true } },
      installments: { select: { paidAmount: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return plans.map((plan) => {
    const paidAmount = plan.installments.reduce(
      (sum, installment) => sum + toNumber(installment.paidAmount),
      0,
    );
    const totalAmount = toNumber(plan.totalAmount);
    const balance = totalAmount - paidAmount;

    return {
      id: plan.id,
      student: plan.student,
      feeType: plan.feeType,
      totalAmount,
      installmentCount: plan.installmentCount,
      paidAmount,
      balance,
      status: balance <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING",
      createdAt: plan.createdAt,
    };
  });
};

const planInclude = {
  student: { select: { id: true, admissionNo: true, name: true } },
  feeType: {
    select: { id: true, name: true, amount: true, period: true },
  },
  installments: { orderBy: { dueDate: "asc" } },
};

const formatPlan = (plan) => {
  const paidAmount = plan.installments.reduce(
    (sum, installment) => sum + toNumber(installment.paidAmount),
    0,
  );
  const totalAmount = toNumber(plan.totalAmount);
  const balance = totalAmount - paidAmount;

  return {
    id: plan.id,
    student: plan.student,
    feeType: plan.feeType,
    totalAmount,
    installmentCount: plan.installmentCount,
    paidAmount,
    balance,
    status: balance <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING",
    installments: plan.installments.map(formatInstallment),
    createdAt: plan.createdAt,
  };
};

export const getFeePlanById = async (userId, id) => {
  const plan = await prisma.studentFee.findFirst({
    where: { id: Number(id), userId },
    include: planInclude,
  });

  if (!plan) {
    return null;
  }

  return formatPlan(plan);
};

export const createFeePlan = async (userId, { studentId, feeTypeId, totalAmount, installmentCount }) => {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: Number(studentId), userId },
      select: { id: true },
    });

    if (!student) {
      return { error: "STUDENT_NOT_FOUND" };
    }

    const feeType = await tx.feeType.findFirst({
      where: { id: Number(feeTypeId), userId },
      select: { id: true, amount: true },
    });

    if (!feeType) {
      return { error: "FEETYPE_NOT_FOUND" };
    }

    const existing = await tx.studentFee.findFirst({
      where: { studentId: student.id, feeTypeId: feeType.id },
      select: { id: true },
    });

    if (existing) {
      return { error: "PLAN_EXISTS" };
    }

    const planTotal = totalAmount !== undefined ? Number(totalAmount) : Number(feeType.amount);
    const count = installmentCount !== undefined ? Number(installmentCount) : 1;
    const schedule = installmentsFor(planTotal, count);

    const plan = await tx.studentFee.create({
      data: {
        studentId: student.id,
        feeTypeId: feeType.id,
        totalAmount: planTotal,
        installmentCount: count,
        userId,
        installments: {
          create: schedule.map((entry) => ({
            amount: entry.amount,
            dueDate: entry.dueDate,
            userId,
          })),
        },
      },
      include: planInclude,
    });

    return formatPlan(plan);
  });
};

export const updateFeePlan = async (userId, id, { feeTypeId, totalAmount, installmentCount }) => {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.studentFee.findFirst({
      where: { id: Number(id), userId },
      select: { id: true, feeTypeId: true, totalAmount: true, installmentCount: true },
    });

    if (!plan) {
      return null;
    }

    const paidInstallments = await tx.feeInstallment.findFirst({
      where: { studentFeeId: plan.id, status: { not: "PENDING" } },
      select: { id: true },
    });

    if (paidInstallments) {
      return { error: "PLAN_UPDATE_HAS_PAYMENTS" };
    }

    let nextFeeTypeId = plan.feeTypeId;

    if (feeTypeId !== undefined) {
      const feeType = await tx.feeType.findFirst({
        where: { id: Number(feeTypeId), userId },
        select: { id: true },
      });

      if (!feeType) {
        return { error: "FEETYPE_NOT_FOUND" };
      }

      nextFeeTypeId = feeType.id;
    }

    const nextTotal =
      totalAmount !== undefined ? Number(totalAmount) : Number(plan.totalAmount);
    const nextCount =
      installmentCount !== undefined
        ? Math.max(1, Number(installmentCount))
        : plan.installmentCount;

    await tx.feeInstallment.deleteMany({ where: { studentFeeId: plan.id } });

    const schedule = installmentsFor(nextTotal, nextCount);

    await tx.studentFee.update({
      where: { id: plan.id },
      data: {
        feeTypeId: nextFeeTypeId,
        totalAmount: nextTotal,
        installmentCount: nextCount,
      },
    });

    await tx.feeInstallment.createMany({
      data: schedule.map((entry) => ({
        studentFeeId: plan.id,
        amount: entry.amount,
        dueDate: entry.dueDate,
        userId,
      })),
    });

    const updated = await tx.studentFee.findUnique({
      where: { id: plan.id },
      include: planInclude,
    });

    return formatPlan(updated);
  });
};

export const deleteFeePlan = async (userId, id) => {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.studentFee.findFirst({
      where: { id: Number(id), userId },
      select: { id: true },
    });

    if (!plan) {
      return null;
    }

    const paidInstallments = await tx.feeInstallment.findFirst({
      where: { studentFeeId: plan.id, status: { not: "PENDING" } },
      select: { id: true },
    });

    if (paidInstallments) {
      return { error: "PLAN_HAS_PAYMENTS" };
    }

    await tx.studentFee.delete({ where: { id: plan.id } });

    return true;
  });
};

export const collectFeePayment = async (
  userId,
  { installmentId, amount, date, notes },
) => {
  return prisma.$transaction(async (tx) => {
    const installment = await tx.feeInstallment.findFirst({
      where: { id: Number(installmentId), userId },
      include: {
        studentFee: {
          include: {
            student: { select: { id: true, name: true, admissionNo: true } },
            feeType: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!installment) {
      return { error: "INSTALLMENT_NOT_FOUND" };
    }

    const remaining = toNumber(installment.amount) - toNumber(installment.paidAmount);
    if (remaining <= 0) {
      return { error: "INSTALLMENT_ALREADY_PAID" };
    }

    const payAmount = Number(amount);
    if (payAmount > remaining) {
      return { error: "AMOUNT_EXCEEDS_REMAINING" };
    }

    const paidOn = date ? new Date(date) : new Date();

    const receipt = await tx.receipt.create({
      data: {
        number: `RC-PENDING-${randomUUID()}`,
        amount: payAmount,
        paidAt: paidOn,
        notes: notes ?? null,
        userId,
      },
    });

    const receiptNumber = `RC-${String(receipt.id).padStart(6, "0")}`;
    const finalReceipt = await tx.receipt.update({
      where: { id: receipt.id },
      data: { number: receiptNumber },
    });

    const newPaidAmount = toNumber(installment.paidAmount) + payAmount;
    const newStatus = newPaidAmount >= toNumber(installment.amount) - 0.001 ? "PAID" : "PARTIAL";

    const updatedInstallment = await tx.feeInstallment.update({
      where: { id: installment.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: paidOn,
        receiptId: receipt.id,
      },
    });

    return {
      installment: formatInstallment(updatedInstallment),
      receipt: {
        id: finalReceipt.id,
        number: finalReceipt.number,
        amount: toNumber(finalReceipt.amount),
        paidAt: finalReceipt.paidAt,
      },
    };
  });
};

export const updateReceipt = async (userId, id, { notes } = {}) => {
  const existing = await prisma.receipt.findFirst({
    where: { id: Number(id), userId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const receipt = await prisma.receipt.update({
    where: { id: Number(id) },
    data: { notes: notes !== undefined ? notes || null : undefined },
  });

  return {
    id: receipt.id,
    number: receipt.number,
    amount: toNumber(receipt.amount),
    paidAt: receipt.paidAt,
    notes: receipt.notes,
  };
};

export const getReceipts = async (userId) => {
  const receipts = await prisma.receipt.findMany({
    where: { userId },
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
    orderBy: { paidAt: "desc" },
  });

  return receipts.map((receipt) => ({
    id: receipt.id,
    number: receipt.number,
    amount: toNumber(receipt.amount),
    paidAt: receipt.paidAt,
    notes: receipt.notes,
    student: receipt.installments[0]?.studentFee.student ?? null,
    feeType: receipt.installments[0]?.studentFee.feeType ?? null,
  }));
};