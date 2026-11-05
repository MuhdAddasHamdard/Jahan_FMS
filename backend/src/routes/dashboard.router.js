import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole, authorizeRoleOrPermission } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import { PERMISSIONS } from "../constants/permissions";
import {
  getDashboard,
  getAdminDashboard,
  getTeacherDashboardData,
} from "../controllers/dashboard.controller";

const router = express.Router();

router.use(authenticateUser);

router.get(
  "/summary",
  authorizeRoleOrPermission(PERMISSIONS.FINANCE, ROLES.ADMIN, ROLES.FINANCE),
  getDashboard,
);
router.get("/admin/summary", authorizeRole(ROLES.ADMIN), getAdminDashboard);
router.get("/teacher", authorizeRole(ROLES.TEACHER), getTeacherDashboardData);

export default router;