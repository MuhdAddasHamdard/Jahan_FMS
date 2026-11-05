import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRoleOrPermission } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import { PERMISSIONS } from "../constants/permissions";
import {
  getReportSummary,
  getInstituteReport,
} from "../controllers/report.controller";

const router = express.Router();

router.use(authenticateUser);

router.get(
  "/summary",
  authorizeRoleOrPermission(PERMISSIONS.REPORTS, ROLES.ADMIN, ROLES.FINANCE),
  getReportSummary,
);
router.get(
  "/institute",
  authorizeRoleOrPermission(PERMISSIONS.REPORTS, ROLES.ADMIN, ROLES.FINANCE),
  getInstituteReport,
);

export default router;