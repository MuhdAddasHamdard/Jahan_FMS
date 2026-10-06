import prisma from "../prisma";
import { toNumber } from "../utils/money";

export const getRefunds = async (userId, filters = {}) => {
  const { studentId } = filters;

  const where = {};

  if (studentId && !Number.isNaN(Number(studentId))) {
    where.studentId = Number(studentId);
  }

  const refunds = await prisma.refund.findMany({
    where,
    include: {
      student: { select: { id: true, admissionNo: true, name: true } },
    },
    orderBy: { refundedOn: "desc" },
  });

  return refunds.map((refund) => ({
    id: refund.id,
    student: refund.student,
    amount: toNumber(refund.amount),
    reason: refund.reason,
    refundedOn: refund.refundedOn,
    createdAt: refund.createdAt,
  }));
};

export const createRefund = async (userId, { studentId, amount, reason, refundedOn }) => {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: Number(studentId) },
      select: { id: true, name: true, admissionNo: true },
    });

    if (!student) {
      return { error: "STUDENT_NOT_FOUND" };
    }

    const paidRows = await tx.feeInstallment.aggregate({
      where: {
        userId,
        studentFee: { studentId: student.id },
      },
      _sum: { paidAmount: true },
    });

    const alreadyRefundedRows = await tx.refund.aggregate({
      where: { studentId: student.id },
      _sum: { amount: true },
    });

    const paid = toNumber(paidRows._sum.paidAmount) ?? 0;
    const alreadyRefunded = toNumber(alreadyRefundedRows._sum.amount) ?? 0;

    const refundAmount = Number(amount);
    if (refundAmount > paid - alreadyRefunded) {
      return { error: "REFUND_EXCEEDS_PAID" };
    }

    const refundedOnDate = refundedOn ? new Date(refundedOn) : new Date();

    const refund = await tx.refund.create({
      data: {
        studentId: student.id,
        amount: refundAmount,
        reason: reason ?? null,
        refundedOn: refundedOnDate,
        userId,
      },
      include: {
        student: { select: { id: true, admissionNo: true, name: true } },
      },
    });

    return {
      id: refund.id,
      student: refund.student,
      amount: toNumber(refund.amount),
      reason: refund.reason,
      refundedOn: refund.refundedOn,
    };
  });
};

export const updateRefund = async (userId, id, { amount, reason, refundedOn }) => {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findFirst({
      where: { id: Number(id) },
      select: { id: true, studentId: true, amount: true },
    });

    if (!refund) {
      return null;
    }

    const nextAmount = amount !== undefined ? Number(amount) : toNumber(refund.amount);

    if (amount !== undefined) {
      const paidRows = await tx.feeInstallment.aggregate({
        where: { studentFee: { studentId: refund.studentId } },
        _sum: { paidAmount: true },
      });

      const alreadyRefundedRows = await tx.refund.aggregate({
        where: { studentId: refund.studentId, id: { not: refund.id } },
        _sum: { amount: true },
      });

      const paid = toNumber(paidRows._sum.paidAmount) ?? 0;
      const alreadyRefunded = toNumber(alreadyRefundedRows._sum.amount) ?? 0;

      if (nextAmount > paid - alreadyRefunded) {
        return { error: "REFUND_EXCEEDS_PAID" };
      }
    }

    const updated = await tx.refund.update({
      where: { id: refund.id },
      data: {
        amount: nextAmount,
        reason: reason !== undefined ? reason || null : undefined,
        refundedOn: refundedOn ? new Date(refundedOn) : undefined,
      },
      include: {
        student: { select: { id: true, admissionNo: true, name: true } },
      },
    });

    return {
      id: updated.id,
      student: updated.student,
      amount: toNumber(updated.amount),
      reason: updated.reason,
      refundedOn: updated.refundedOn,
    };
  });
};

export const deleteRefund = async (userId, id) => {
  const refund = await prisma.refund.findFirst({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!refund) {
    return null;
  }

  await prisma.refund.delete({ where: { id: refund.id } });

  return true;
};