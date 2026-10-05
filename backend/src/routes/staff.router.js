import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import {
  validateStaff,
  validateStaffUpdate,
  validateSalaryPayment,
  validateSalaryPaymentUpdate,
} from "../middleware/staff.validation";
import {
  getStaffList,
  getStaff,
  createStaffController,
  updateStaffController,
  deleteStaffController,
  getSalaryPaymentsController,
  createSalaryPaymentController,
  updateSalaryPaymentController,
  deleteSalaryPaymentController,
} from "../controllers/staff.controller";

const router = express.Router();

router.use(authenticateUser, authorizeRole(ROLES.ADMIN, ROLES.FINANCE));

router.get("/", getStaffList);
router.post("/", validateStaff, createStaffController);
router.get("/:id", getStaff);
router.patch("/:id", validateStaffUpdate, updateStaffController);
router.delete("/:id", deleteStaffController);

router.get("/:id/payments", getSalaryPaymentsController);

export default router;

export const salaryRouter = express.Router();

salaryRouter.use(authenticateUser, authorizeRole(ROLES.ADMIN, ROLES.FINANCE));

salaryRouter.get("/", getSalaryPaymentsController);
salaryRouter.post("/", validateSalaryPayment, createSalaryPaymentController);
salaryRouter.patch("/:id", validateSalaryPaymentUpdate, updateSalaryPaymentController);
salaryRouter.delete("/:id", deleteSalaryPaymentController);