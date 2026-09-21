import {
  getAllUsers,
  createUserService,
  getUserById,
  loginUserService,
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
