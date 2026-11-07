import { FEE_PERIODS, INSTALLMENT_STATUSES } from "../constants/fee";

const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const DISCOUNT_TYPES = ["NONE", "PERCENTAGE", "FIXED"];

const validateDiscount = (body) => {
  const { discountType, discountValue } = body;
  if (discountType === undefined && discountValue === undefined) return null;

  if (discountType !== undefined && !DISCOUNT_TYPES.includes(discountType)) {
    return "discountType must be NONE, PERCENTAGE or FIXED";
  }
  if (discountValue !== undefined && (
    !Number.isFinite(Number(discountValue)) ||
    Number(discountValue) < 0 ||
    !/^\d+(\.\d{1,2})?$/.test(String(discountValue))
  )) {
    return "discountValue must be a non-negative amount with at most two decimal places";
  }
  if (
    discountType === undefined &&
    discountValue !== undefined &&
    Number(discountValue) !== 0
  ) {
    return "discountType is required when a discountValue is provided";
  }
  if (discountType === "NONE" && Number(discountValue ?? 0) !== 0) {
    return "discountValue must be zero when discountType is NONE";
  }
  if (
    discountType === "PERCENTAGE" &&
    (!isPositiveNumber(discountValue) || Number(discountValue) > 100)
  ) {
    return "Percentage discount must be greater than zero and at most 100";
  }
  if (discountType === "FIXED" && !isPositiveNumber(discountValue)) {
    return "Fixed discount must be greater than zero";
  }

  return null;
};

export const validateFeeType = (req, res, next) => {
  const { name, amount, period } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (amount !== undefined && !isPositiveNumber(amount)) {
    return res.status(400).json({ message: "Amount must be a positive number" });
  }

  if (period !== undefined && !FEE_PERIODS.includes(period)) {
    return res.status(400).json({
      message: `Period must be one of: ${FEE_PERIODS.join(", ")}`,
    });
  }

  next();
};

export const validateFeeTypeUpdate = (req, res, next) => {
  const { name, amount, period } = req.body;

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return res.status(400).json({ message: "Name must be a non-empty string" });
  }

  if (amount !== undefined && !isPositiveNumber(amount)) {
    return res.status(400).json({ message: "Amount must be a positive number" });
  }

  if (period !== undefined && !FEE_PERIODS.includes(period)) {
    return res.status(400).json({
      message: `Period must be one of: ${FEE_PERIODS.join(", ")}`,
    });
  }

  if (name === undefined && amount === undefined && period === undefined) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  next();
};

export const validateFeePlan = (req, res, next) => {
  const { studentId, feeTypeId, totalAmount, installmentCount } = req.body;

  if (!studentId || Number.isNaN(Number(studentId))) {
    return res.status(400).json({ message: "studentId is required" });
  }

  if (!feeTypeId || Number.isNaN(Number(feeTypeId))) {
    return res.status(400).json({ message: "feeTypeId is required" });
  }

  if (totalAmount !== undefined && !isPositiveNumber(totalAmount)) {
    return res.status(400).json({ message: "totalAmount must be a positive number" });
  }

  if (installmentCount !== undefined && !Number.isInteger(Number(installmentCount))) {
    return res.status(400).json({ message: "installmentCount must be an integer" });
  }

  const discountError = validateDiscount(req.body);
  if (discountError) return res.status(400).json({ message: discountError });

  next();
};

export const validateFeePlanUpdate = (req, res, next) => {
  const { feeTypeId, totalAmount, installmentCount, discountType, discountValue } =
    req.body;

  if (feeTypeId !== undefined && Number.isNaN(Number(feeTypeId))) {
    return res.status(400).json({ message: "feeTypeId must be a number" });
  }

  if (totalAmount !== undefined && !isPositiveNumber(totalAmount)) {
    return res.status(400).json({ message: "totalAmount must be a positive number" });
  }

  if (
    installmentCount !== undefined &&
    (!Number.isInteger(Number(installmentCount)) || Number(installmentCount) < 1)
  ) {
    return res.status(400).json({
      message: "installmentCount must be an integer of at least 1",
    });
  }

  if ((discountType === undefined) !== (discountValue === undefined)) {
    return res.status(400).json({
      message: "discountType and discountValue must be updated together",
    });
  }

  const discountError = validateDiscount(req.body);
  if (discountError) return res.status(400).json({ message: discountError });

  if (
    feeTypeId === undefined &&
    totalAmount === undefined &&
    installmentCount === undefined &&
    discountType === undefined
  ) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  next();
};

export const validateReceiptUpdate = (req, res, next) => {
  const { notes, amount, paidAt, installmentId } = req.body;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!["notes", "amount", "paidAt", "installmentId"].includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not updatable` });
    }
  }

  if (amount !== undefined && !isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (paidAt !== undefined && (typeof paidAt !== "string" || Number.isNaN(Date.parse(paidAt)))) {
    return res.status(400).json({ message: "paidAt must be a valid date" });
  }

  if (
    installmentId !== undefined &&
    (installmentId === null || Number.isNaN(Number(installmentId)))
  ) {
    return res.status(400).json({ message: "installmentId must be a number" });
  }

  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return res.status(400).json({ message: "notes must be a string" });
  }

  if (typeof notes === "string" && notes.length > 500) {
    return res.status(400).json({ message: "notes must be 500 characters or less" });
  }

  next();
};

export const validateFeePayment = (req, res, next) => {
  const { installmentId, amount, date } = req.body;

  if (!installmentId || Number.isNaN(Number(installmentId))) {
    return res.status(400).json({ message: "installmentId is required" });
  }

  if (!isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (date !== undefined && Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ message: "date must be a valid date" });
  }

  next();
};

export const validateInstallmentStatus = (req, res, next) => {
  const { status } = req.body;

  if (status !== undefined && !INSTALLMENT_STATUSES.includes(status)) {
    return res.status(400).json({
      message: `Status must be one of: ${INSTALLMENT_STATUSES.join(", ")}`,
    });
  }

  next();
};