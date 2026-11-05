import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRoleOrPermission } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import { PERMISSIONS } from "../constants/permissions";
import {
  validateStaff,
  validateStaffUpdate,
} from "../middleware/staff.validation";
import {
  getStaffList,
  getStaff,
  createStaffController,
  updateStaffController,
  deleteStaffController,
} from "../controllers/staff.controller";

const router = express.Router();

router.use(
  authenticateUser,
  authorizeRoleOrPermission(PERMISSIONS.STAFF, ROLES.ADMIN, ROLES.FINANCE),
);

router.get("/", getStaffList);
router.post("/", validateStaff, createStaffController);
router.get("/:id", getStaff);
router.patch("/:id", validateStaffUpdate, updateStaffController);
router.delete("/:id", deleteStaffController);

export default router;