import { STAFF_DESIGNATIONS, PERIOD_MONTH_PATTERN } from "../constants/staff";

const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export const validateStaff = (req, res, next) => {
  const { staffNo, name, designation, salary } = req.body;

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

  if (salary !== undefined && !isPositiveNumber(salary)) {
    return res.status(400).json({ message: "salary must be a positive number" });
  }

  next();
};

export const validateStaffUpdate = (req, res, next) => {
  const fields = ["staffNo", "name", "designation", "phone", "email", "salary"];
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

  if (req.body.salary !== undefined && !isPositiveNumber(req.body.salary)) {
    return res.status(400).json({ message: "salary must be a positive number" });
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
  const { amount, refundedOn } = req.body;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!["amount", "reason", "refundedOn"].includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not updatable` });
    }
  }

  if (amount !== undefined && !isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (refundedOn !== undefined && Number.isNaN(Date.parse(refundedOn))) {
    return res.status(400).json({ message: "refundedOn must be a valid date" });
  }

  next();
};

export const validateRefund = (req, res, next) => {
  const { studentId, amount, refundedOn } = req.body;

  if (!studentId || Number.isNaN(Number(studentId))) {
    return res.status(400).json({ message: "studentId is required" });
  }

  if (!isPositiveNumber(amount)) {
    return res.status(400).json({ message: "amount must be a positive number" });
  }

  if (refundedOn !== undefined && Number.isNaN(Date.parse(refundedOn))) {
    return res.status(400).json({ message: "refundedOn must be a valid date" });
  }

  next();
};