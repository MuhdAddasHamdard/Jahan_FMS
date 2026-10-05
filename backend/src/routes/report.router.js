import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import {
  getReportSummary,
  getInstituteReport,
} from "../controllers/report.controller";

const router = express.Router();

router.use(authenticateUser);

router.get("/summary", authorizeRole(ROLES.ADMIN, ROLES.FINANCE), getReportSummary);
router.get("/institute", authorizeRole(ROLES.ADMIN, ROLES.FINANCE), getInstituteReport);

export default router;