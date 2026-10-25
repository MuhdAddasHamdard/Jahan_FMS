import prisma from "../prisma";
import { toNumber } from "../utils/money";

const formatReceiptRef = (receipt) =>
  receipt
    ? {
        id: receipt.id,
        number: receipt.number,
        amount: toNumber(receipt.amount),
        paidAt: receipt.paidAt,
      }
    : null;

const formatRefund = (refund) => ({
  id: refund.id,
  student: refund.student,
  receipt: formatReceiptRef(refund.receipt),
  amount: toNumber(refund.amount),
  reason: refund.reason,
  refundedOn: refund.refundedOn,
  createdAt: refund.createdAt,
});

const refundInclude = {
  student: { select: { id: true, admissionNo: true, name: true } },
  receipt: { select: { id: true, number: true, amount: true, paidAt: true } },
};

// Confirms a receipt belongs to the student being refunded. Receipts reach a
// student through their installments, so any of the linked installments must
// point at that student.
const receiptBelongsToStudent = async (tx, receiptId, studentId) => {
  const receipt = await tx.receipt.findFirst({
    where: { id: Number(receiptId) },
    include: {
      installments: {
        include: { studentFee: { select: { studentId: true } } },
      },
    },
  });

  if (!receipt) {
    return { error: "RECEIPT_NOT_FOUND" };
  }

  const belongs = receipt.installments.some(
    (installment) => installment.studentFee.studentId === studentId,
  );

  if (!belongs) {
    return { error: "RECEIPT_STUDENT_MISMATCH" };
  }

  return { receipt };
};

export const getRefunds = async (userId, filters = {}) => {
  const { studentId } = filters;

  const where = {};

  if (studentId && !Number.isNaN(Number(studentId))) {
    where.studentId = Number(studentId);
  }

  const refunds = await prisma.refund.findMany({
    where,
    include: refundInclude,
    orderBy: { refundedOn: "desc" },
  });

  return refunds.map(formatRefund);
};

export const createRefund = async (
  userId,
  { studentId, receiptId, amount, reason, refundedOn },
) => {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: Number(studentId) },
      select: { id: true, name: true, admissionNo: true },
    });

    if (!student) {
      return { error: "STUDENT_NOT_FOUND" };
    }

    let linkedReceiptId = null;

    if (receiptId !== undefined && receiptId !== null && receiptId !== "") {
      const check = await receiptBelongsToStudent(tx, receiptId, student.id);
      if (check.error) {
        return { error: check.error };
      }

      const receiptRefunds = await tx.refund.aggregate({
        where: { receiptId: check.receipt.id },
        _sum: { amount: true },
      });

      const receiptRefunded = toNumber(receiptRefunds._sum.amount) ?? 0;
      if (Number(amount) > toNumber(check.receipt.amount) - receiptRefunded) {
        return { error: "REFUND_EXCEEDS_RECEIPT" };
      }

      linkedReceiptId = check.receipt.id;
    }

    const paidRows = await tx.feeInstallment.aggregate({
      where: {
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
        receiptId: linkedReceiptId,
        amount: refundAmount,
        reason: reason ?? null,
        refundedOn: refundedOnDate,
        userId,
      },
      include: refundInclude,
    });

    return formatRefund(refund);
  });
};

export const updateRefund = async (
  userId,
  id,
  { receiptId, amount, reason, refundedOn },
) => {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findFirst({
      where: { id: Number(id) },
      select: { id: true, studentId: true, receiptId: true, amount: true },
    });

    if (!refund) {
      return null;
    }

    const nextAmount = amount !== undefined ? Number(amount) : toNumber(refund.amount);
    let nextReceiptId = refund.receiptId;

    if (receiptId !== undefined) {
      if (receiptId === null || receiptId === "") {
        nextReceiptId = null;
      } else {
        const check = await receiptBelongsToStudent(tx, receiptId, refund.studentId);
        if (check.error) {
          return { error: check.error };
        }

        const receiptRefunds = await tx.refund.aggregate({
          where: { receiptId: check.receipt.id, id: { not: refund.id } },
          _sum: { amount: true },
        });

        const receiptRefunded = toNumber(receiptRefunds._sum.amount) ?? 0;
        if (nextAmount > toNumber(check.receipt.amount) - receiptRefunded) {
          return { error: "REFUND_EXCEEDS_RECEIPT" };
        }

        nextReceiptId = check.receipt.id;
      }
    }

    if (amount !== undefined && nextReceiptId && nextReceiptId === refund.receiptId) {
      const receipt = await tx.receipt.findUnique({
        where: { id: nextReceiptId },
        select: { amount: true },
      });
      const receiptRefunds = await tx.refund.aggregate({
        where: { receiptId: nextReceiptId, id: { not: refund.id } },
        _sum: { amount: true },
      });

      if (receipt) {
        const receiptRefunded = toNumber(receiptRefunds._sum.amount) ?? 0;
        if (nextAmount > toNumber(receipt.amount) - receiptRefunded) {
          return { error: "REFUND_EXCEEDS_RECEIPT" };
        }
      }
    }

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
        receiptId: nextReceiptId,
        amount: nextAmount,
        reason: reason !== undefined ? reason || null : undefined,
        refundedOn: refundedOn ? new Date(refundedOn) : undefined,
      },
      include: refundInclude,
    });

    return formatRefund(updated);
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