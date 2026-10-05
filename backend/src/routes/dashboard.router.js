import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import {
  getDashboard,
  getAdminDashboard,
  getTeacherDashboardData,
} from "../controllers/dashboard.controller";

const router = express.Router();

router.use(authenticateUser);

router.get("/summary", authorizeRole(ROLES.ADMIN, ROLES.FINANCE), getDashboard);
router.get("/admin/summary", authorizeRole(ROLES.ADMIN), getAdminDashboard);
router.get("/teacher", authorizeRole(ROLES.TEACHER), getTeacherDashboardData);

export default router;