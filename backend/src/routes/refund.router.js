import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import { validateRefund, validateRefundUpdate } from "../middleware/staff.validation";
import {
  getRefundsController,
  createRefundController,
  updateRefundController,
  deleteRefundController,
} from "../controllers/refund.controller";

const router = express.Router();

router.use(authenticateUser, authorizeRole(ROLES.ADMIN, ROLES.FINANCE));

router.get("/", getRefundsController);
router.post("/", validateRefund, createRefundController);
router.patch("/:id", validateRefundUpdate, updateRefundController);
router.delete("/:id", deleteRefundController);

export default router;