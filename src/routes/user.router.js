import express from "express";
import { getUsers, createUser } from "../controllers/user.controller";
import { validateUser } from "../middleware/user.validation";

const router = express.Router();

router.get("/", getUsers);
router.post("/", validateUser, createUser);
export default router;
