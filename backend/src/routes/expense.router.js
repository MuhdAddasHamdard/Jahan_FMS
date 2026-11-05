import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRoleOrPermission } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import { PERMISSIONS } from "../constants/permissions";
import {
  validateExpense,
  validateExpenseUpdate,
} from "../middleware/expense.validation";
import {
  getExpensesController,
  getExpenseController,
  createExpenseController,
  updateExpenseController,
  deleteExpenseController,
} from "../controllers/expense.controller";

const router = express.Router();

router.use(
  authenticateUser,
  authorizeRoleOrPermission(PERMISSIONS.FINANCE, ROLES.ADMIN, ROLES.FINANCE),
);

router.get("/", getExpensesController);
router.post("/", validateExpense, createExpenseController);
router.get("/:id", getExpenseController);
router.patch("/:id", validateExpenseUpdate, updateExpenseController);
router.delete("/:id", deleteExpenseController);

export default router;