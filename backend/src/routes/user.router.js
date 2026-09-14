import express from "express";
import { validateUser } from "../middleware/user.validation";
import {
  getUsers,
  createUser,
  loginUser,
} from "../controllers/user.controller";
const router = express.Router();

router.get("/", getUsers);
router.post("/", validateUser, createUser);
router.post("/login", loginUser);
export default router;
