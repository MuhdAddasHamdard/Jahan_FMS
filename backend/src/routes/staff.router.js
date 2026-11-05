import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
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

router.use(authenticateUser, authorizeRole(ROLES.ADMIN, ROLES.FINANCE));

router.get("/", getStaffList);
router.post("/", validateStaff, createStaffController);
router.get("/:id", getStaff);
router.patch("/:id", validateStaffUpdate, updateStaffController);
router.delete("/:id", deleteStaffController);

export default router;