import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRoleOrPermission } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import { PERMISSIONS } from "../constants/permissions";
import {
  validateSalaryPayment,
  validateSalaryPaymentUpdate,
  validateStaffSalary,
  validateStaffSalaryUpdate,
} from "../middleware/staff.validation";
import {
  createSalaryPaymentController,
  createSalaryRateController,
  deleteSalaryPaymentController,
  deleteSalaryRateController,
  getSalaryPaymentsController,
  getSalaryRatesController,
  updateSalaryPaymentController,
  updateSalaryRateController,
} from "../controllers/salary.controller";

const router = express.Router();

router.use(
  authenticateUser,
  authorizeRoleOrPermission(PERMISSIONS.FINANCE, ROLES.ADMIN, ROLES.FINANCE),
);

router.get("/rates", getSalaryRatesController);
router.post("/rates", validateStaffSalary, createSalaryRateController);
router.patch("/rates/:id", validateStaffSalaryUpdate, updateSalaryRateController);
router.delete("/rates/:id", deleteSalaryRateController);

router.get("/payments", getSalaryPaymentsController);
router.post("/payments", validateSalaryPayment, createSalaryPaymentController);
router.patch("/payments/:id", validateSalaryPaymentUpdate, updateSalaryPaymentController);
router.delete("/payments/:id", deleteSalaryPaymentController);

export const salaryPaymentRouter = express.Router();
salaryPaymentRouter.use(
  authenticateUser,
  authorizeRoleOrPermission(PERMISSIONS.FINANCE, ROLES.ADMIN, ROLES.FINANCE),
);
salaryPaymentRouter.get("/", getSalaryPaymentsController);
salaryPaymentRouter.post("/", validateSalaryPayment, createSalaryPaymentController);
salaryPaymentRouter.patch("/:id", validateSalaryPaymentUpdate, updateSalaryPaymentController);
salaryPaymentRouter.delete("/:id", deleteSalaryPaymentController);

export default router;
