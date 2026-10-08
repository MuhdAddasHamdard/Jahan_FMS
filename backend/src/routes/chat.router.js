import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { postChat } from "../controllers/chat.controller";

const router = express.Router();

router.use(authenticateUser);
router.post("/", postChat);

export default router;
