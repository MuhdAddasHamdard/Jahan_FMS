import express from "express";
import { validateUser } from "../middleware/user.validation";
import {
  getUsers,
  createUser,
  loginUser,
  getCurrentUser,
} from "../controllers/user.controller";

import { authenticateUser } from "../middleware/auth.middleware";
const router = express.Router();

router.get("/", authenticateUser, getUsers);
router.post("/", validateUser, createUser);
router.post("/login", loginUser);
router.get("/me", authenticateUser, getCurrentUser);

export default router;
