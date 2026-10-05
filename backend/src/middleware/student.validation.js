import { STUDENT_STATUSES } from "../constants/student";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateStudentAccount = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!email || typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  if (name !== undefined && name !== null && String(name).trim().length === 0) {
    return res.status(400).json({ message: "Name must be a non-empty string" });
  }

  next();
};

export const validateStudent = (req, res, next) => {
  const { admissionNo, name, status, classId } = req.body;

  if (!admissionNo || typeof admissionNo !== "string" || admissionNo.trim().length === 0) {
    return res.status(400).json({ message: "Admission number is required" });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (status !== undefined && !STUDENT_STATUSES.includes(status)) {
    return res.status(400).json({
      message: `Status must be one of: ${STUDENT_STATUSES.join(", ")}`,
    });
  }

  if (classId !== undefined && classId !== null && Number.isNaN(Number(classId))) {
    return res.status(400).json({ message: "classId must be a number" });
  }

  next();
};

export const validateStudentUpdate = (req, res, next) => {
  const fields = ["admissionNo", "name", "guardianName", "phone", "email", "address", "status", "classId"];
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!fields.includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not updatable` });
    }
    if (key !== "classId" && (req.body[key] === null || req.body[key] === "")) {
      req.body[key] = undefined;
    }
  }

  if (req.body.admissionNo !== undefined && String(req.body.admissionNo).trim().length === 0) {
    return res.status(400).json({ message: "Admission number must be a non-empty string" });
  }

  if (req.body.name !== undefined && String(req.body.name).trim().length === 0) {
    return res.status(400).json({ message: "Name must be a non-empty string" });
  }

  if (req.body.status !== undefined && !STUDENT_STATUSES.includes(req.body.status)) {
    return res.status(400).json({
      message: `Status must be one of: ${STUDENT_STATUSES.join(", ")}`,
    });
  }

  if ("classId" in req.body) {
    if (req.body.classId === null || req.body.classId === "") {
      req.body.clearClass = true;
    } else if (Number.isNaN(Number(req.body.classId))) {
      return res.status(400).json({ message: "classId must be a number" });
    }
  }

  next();
};