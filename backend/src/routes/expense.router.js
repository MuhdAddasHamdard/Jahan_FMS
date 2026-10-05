import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
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

router.use(authenticateUser, authorizeRole(ROLES.ADMIN, ROLES.FINANCE));

router.get("/", getExpensesController);
router.post("/", validateExpense, createExpenseController);
router.get("/:id", getExpenseController);
router.patch("/:id", validateExpenseUpdate, updateExpenseController);
router.delete("/:id", deleteExpenseController);

export default router;