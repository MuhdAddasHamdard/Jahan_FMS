import {
  getAllUsers,
  createUserService,
  getUserById,
  loginUserService,
  updateUserRole,
  deleteUser,
  updateCurrentUserService,
  updateUserService,
  verifyCurrentPassword,
} from "../services/user.service";
import jwt from "jsonwebtoken";

import { Prisma } from "../../generated/prisma/client";

export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await loginUserService(email, password);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
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
    return res.status(200).json({
      user,
    });
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
    const user = await updateCurrentUserService(req.user.id, req.body);

    res.status(200).json(user);
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

export const setUserRole = async (req, res) => {
  const { role } = req.body;

  try {
    const user = await updateUserRole(req.params.id, role);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({
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

export const removeUser = async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const result = await deleteUser(req.params.id);

    if (result === null) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};
