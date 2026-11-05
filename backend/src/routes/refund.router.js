import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRoleOrPermission } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import { PERMISSIONS } from "../constants/permissions";
import { validateRefund, validateRefundUpdate } from "../middleware/staff.validation";
import {
  getRefundsController,
  createRefundController,
  updateRefundController,
  deleteRefundController,
} from "../controllers/refund.controller";

const router = express.Router();

router.use(
  authenticateUser,
  authorizeRoleOrPermission(PERMISSIONS.FINANCE, ROLES.ADMIN, ROLES.FINANCE),
);

router.get("/", getRefundsController);
router.post("/", validateRefund, createRefundController);
router.patch("/:id", validateRefundUpdate, updateRefundController);
router.delete("/:id", deleteRefundController);

export default router;