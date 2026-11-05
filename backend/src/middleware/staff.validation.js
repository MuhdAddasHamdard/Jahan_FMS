import { STAFF_DESIGNATIONS, PERIOD_MONTH_PATTERN } from "../constants/staff";

const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export const validateStaff = (req, res, next) => {
  const { staffNo, name, designation } = req.body;

  if ("salary" in req.body) {
    return res.status(400).json({ message: "Manage salary rates in the Salaries section" });
  }

  if (!staffNo || typeof staffNo !== "string" || staffNo.trim().length === 0) {
    return res.status(400).json({ message: "Staff number is required" });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (designation !== undefined && !STAFF_DESIGNATIONS.includes(designation)) {
    return res.status(400).json({
      message: `Designation must be one of: ${STAFF_DESIGNATIONS.join(", ")}`,
    });
  }

  next();
};

export const validateStaffUpdate = (req, res, next) => {
  const fields = ["staffNo", "name", "designation", "phone", "email"];
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!fields.includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not updatable` });
    }
    if (req.body[key] === null || req.body[key] === "") {
      req.body[key] = undefined;
    }
  }

  if (req.body.staffNo !== undefined && String(req.body.staffNo).trim().length === 0) {
    return res.status(400).json({ message: "Staff number must be a non-empty string" });
  }

  if (req.body.name !== undefined && String(req.body.name).trim().length === 0) {
    return res.status(400).json({ message: "Name must be a non-empty string" });
  }

  if (req.body.designation !== undefined && !STAFF_DESIGNATIONS.includes(req.body.designation)) {
    return res.status(400).json({
      message: `Designation must be one of: ${STAFF_DESIGNATIONS.join(", ")}`,
    });
  }

  next();
};

const isValidDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const validateStaffSalary = (req, res, next) => {
  const { staffId, amount, effectiveFrom } = req.body;

  if (!staffId || !Number.isInteger(Number(staffId)) || Number(staffId) <= 0) {
    return res.status(400).json({ message: "staffId is required" });
  }
  if (!isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }
  if (!isValidDateOnly(effectiveFrom)) {
    return res.status(400).json({ message: "effectiveFrom must be a valid YYYY-MM-DD date" });
  }

  next();
};

export const validateStaffSalaryUpdate = (req, res, next) => {
  const { amount, effectiveFrom } = req.body;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }
  for (const key of keys) {
    if (!["amount", "effectiveFrom"].includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not updatable` });
    }
  }
  if (amount !== undefined && !isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }
  if (effectiveFrom !== undefined && !isValidDateOnly(effectiveFrom)) {
    return res.status(400).json({ message: "effectiveFrom must be a valid YYYY-MM-DD date" });
  }

  next();
};

export const validateSalaryPayment = (req, res, next) => {
  const { staffId, periodMonth, amount, paidOn } = req.body;

  if (!staffId || Number.isNaN(Number(staffId))) {
    return res.status(400).json({ message: "staffId is required" });
  }

  if (!periodMonth || typeof periodMonth !== "string" || !PERIOD_MONTH_PATTERN.test(periodMonth)) {
    return res.status(400).json({ message: "periodMonth must be in YYYY-MM format" });
  }

  if (amount !== undefined && !isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (paidOn !== undefined && Number.isNaN(Date.parse(paidOn))) {
    return res.status(400).json({ message: "paidOn must be a valid date" });
  }

  next();
};

export const validateSalaryPaymentUpdate = (req, res, next) => {
  const { periodMonth, amount, paidOn } = req.body;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!["periodMonth", "amount", "paidOn"].includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not updatable` });
    }
  }

  if (periodMonth !== undefined && (typeof periodMonth !== "string" || !PERIOD_MONTH_PATTERN.test(periodMonth))) {
    return res.status(400).json({ message: "periodMonth must be in YYYY-MM format" });
  }

  if (amount !== undefined && !isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (paidOn !== undefined && Number.isNaN(Date.parse(paidOn))) {
    return res.status(400).json({ message: "paidOn must be a valid date" });
  }

  next();
};

export const validateRefundUpdate = (req, res, next) => {
  const { amount, receiptId, refundedOn } = req.body;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!["amount", "reason", "receiptId", "refundedOn"].includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not updatable` });
    }
  }

  if (amount !== undefined && !isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (
    receiptId !== undefined &&
    receiptId !== null &&
    receiptId !== "" &&
    Number.isNaN(Number(receiptId))
  ) {
    return res.status(400).json({ message: "receiptId must be a number" });
  }

  if (refundedOn !== undefined && Number.isNaN(Date.parse(refundedOn))) {
    return res.status(400).json({ message: "refundedOn must be a valid date" });
  }

  next();
};

export const validateRefund = (req, res, next) => {
  const { studentId, receiptId, amount, refundedOn } = req.body;

  if (!studentId || Number.isNaN(Number(studentId))) {
    return res.status(400).json({ message: "studentId is required" });
  }

  if (!isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (
    receiptId !== undefined &&
    receiptId !== null &&
    receiptId !== "" &&
    Number.isNaN(Number(receiptId))
  ) {
    return res.status(400).json({ message: "receiptId must be a number" });
  }

  if (refundedOn !== undefined && Number.isNaN(Date.parse(refundedOn))) {
    return res.status(400).json({ message: "refundedOn must be a valid date" });
  }

  next();
};