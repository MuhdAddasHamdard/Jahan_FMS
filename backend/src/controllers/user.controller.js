import {
  getAllUsers,
  getTeachers,
  createUserService,
  getUserById,
  loginUserService,
  updateUserRole,
  updateUserPermissions,
  setAccountActive,
  updateCurrentUserService,
  updateUserService,
  verifyCurrentPassword,
} from "../services/user.service";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { getOfflineAccess } from "../services/offline.service";

import { DEFAULT_ROLE, ROLES } from "../constants/roles";
import { Prisma } from "../../generated/prisma/client";

export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTeachersController = async (req, res) => {
  try {
    const teachers = await getTeachers();
    res.status(200).json(teachers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const createUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await createUserService({
      name,
      email,
      password,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const createManagedUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (role !== undefined && !Object.values(ROLES).includes(role)) {
    return res
      .status(400)
      .json({ message: "Role must be one of: ADMIN, FINANCE, TEACHER, STUDENT" });
  }

  try {
    const user = await createUserService({
      name: String(name).trim(),
      email: String(email).trim(),
      password,
      role: role ?? DEFAULT_ROLE,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const account = await loginUserService(email, password);

    if (!account) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    const { user, sessionVersion } = account;
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        sessionVersion,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
        jwtid: randomUUID(),
      },
    );
    return res.status(200).json({
      message: "Login successful",
      user,
      token,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    const offline = await getOfflineAccess(req.user.id, req.get("X-Offline-Device"));
    return res.status(200).json({ user, offline });
  } catch (error) {
    console.error(error);
  }
  return res.status(500).json({
    message: "something went wrong on the server",
  });
};

export const updateCurrentUser = async (req, res) => {
  const { password, currentPassword } = req.body;

  if (password) {
    const isValid = await verifyCurrentPassword(req.user.id, currentPassword);
    if (!isValid) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }
  }

  try {
    const user = await updateCurrentUserService(req.user.id, req.body, req.user.sessionVersion);

    res.status(200).json(user);
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(401).json({ message: "Your session has ended. Sign in again." });
    }
    console.error(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const setUserRole = async (req, res) => {
  const { role } = req.body;

  try {
    const user = await updateUserRole(req.user, req.params.id, role);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.error) return sendAccountError(res, user.error);
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const setUserPermissions = async (req, res) => {
  try {
    const user = await updateUserPermissions(req.params.id, req.body.permissions);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.error === "ADMIN_PERMISSIONS_IMMUTABLE") {
      return res.status(400).json({
        message: "Administrator access is managed by the ADMIN role.",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const updateManagedUser = async (req, res) => {
  try {
    const user = await updateUserService(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "That email is already used by another user",
      });
    }
    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

const sendAccountError = (res, error) => {
  if (error === "ADMIN_SESSION_CHANGED") return res.status(401).json({ message: "Your administrator session has changed." });
  if (error === "LAST_ADMIN") return res.status(409).json({ message: "The institute needs at least one active administrator." });
  return res.status(400).json({ message: "You cannot deactivate your own account." });
};

export const changeAccountStatus = async (req, res) => {
  const legacyDelete = req.method === "DELETE";
  const active = legacyDelete ? false : req.body?.active;
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0 || typeof active !== "boolean") {
    return res.status(400).json({ message: "Enter a valid account and status." });
  }
  try {
    const result = await setAccountActive(req.user, id, active);

    if (result === null) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (result.error) return sendAccountError(res, result.error);
    if (legacyDelete) return res.status(204).send();
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};
