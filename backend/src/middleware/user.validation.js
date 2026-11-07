import { PERMISSION_VALUES } from "../constants/permissions";

const MAX_AVATAR_LENGTH = 1_500_000;
const MIN_PASSWORD_LENGTH = 12;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateManagedUserUpdate = (req, res, next) => {
  const { name, email, password } = req.body;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  for (const key of keys) {
    if (!["name", "email", "password"].includes(key)) {
      return res.status(400).json({ message: `Field "${key}" is not editable here` });
    }
  }

  if (name !== undefined && String(name).trim().length === 0) {
    return res.status(400).json({ message: "Name must be a non-empty string" });
  }

  if (email !== undefined && !EMAIL_PATTERN.test(String(email))) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  if (password !== undefined && String(password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  next();
};

export const validateUserPermissions = (req, res, next) => {
  const { permissions } = req.body;

  if (Object.keys(req.body).length !== 1 || !Array.isArray(permissions)) {
    return res.status(400).json({ message: "Provide a permissions array" });
  }

  if (
    permissions.some(
      (permission) =>
        typeof permission !== "string" ||
        !PERMISSION_VALUES.includes(permission),
    )
  ) {
    return res.status(400).json({ message: "One or more permissions are invalid" });
  }

  if (new Set(permissions).size !== permissions.length) {
    return res.status(400).json({ message: "Permissions must not contain duplicates" });
  }

  next();
};

export const validateUser = (req, res, next) => {
  const { name, password, email } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password are required",
    });
  }
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Name, email and password must be strings",
    });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return res.status(400).json({
      message: "Please provide a valid email address",
    });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    !EMAIL_PATTERN.test(email) ||
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  next();
};

export const validateProfileUpdate = (req, res, next) => {
  const { name, email, avatarUrl, password, currentPassword } = req.body;

  if (name !== undefined && typeof name !== "string") {
    return res.status(400).json({ message: "Name must be a string" });
  }

  if (email !== undefined) {
    if (typeof email !== "string") {
      return res.status(400).json({ message: "Email must be a string" });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== "string") {
      return res.status(400).json({ message: "Avatar must be a string" });
    }
    if (typeof avatarUrl === "string" && avatarUrl.length > MAX_AVATAR_LENGTH) {
      return res.status(413).json({
        message: "That photo is too large. Please choose a smaller image.",
      });
    }
  }

  if (password !== undefined) {
    if (typeof password !== "string") {
      return res.status(400).json({ message: "Password must be a string" });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }
    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({ message: "Current password is required to change your password" });
    }
  }

  const hasUpdates = name !== undefined || email !== undefined || avatarUrl !== undefined || password !== undefined;
  if (!hasUpdates) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  next();
};
