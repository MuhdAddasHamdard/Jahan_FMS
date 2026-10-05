import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import {
  validateFeeType,
  validateFeeTypeUpdate,
  validateFeePlan,
  validateFeePlanUpdate,
  validateFeePayment,
  validateReceiptUpdate,
} from "../middleware/fee.validation";
import {
  getFeeTypes,
  getFeeType,
  createFeeTypeController,
  updateFeeTypeController,
  deleteFeeTypeController,
  getFeePlans,
  getFeePlan,
  createFeePlanController,
  updateFeePlanController,
  deleteFeePlanController,
  collectFeePaymentController,
  getReceiptsController,
  updateReceiptController,
} from "../controllers/fee.controller";

const router = express.Router();

router.use(authenticateUser, authorizeRole(ROLES.ADMIN, ROLES.FINANCE));

router.get("/types", getFeeTypes);
router.post("/types", validateFeeType, createFeeTypeController);
router.get("/types/:id", getFeeType);
router.patch("/types/:id", validateFeeTypeUpdate, updateFeeTypeController);
router.delete("/types/:id", deleteFeeTypeController);

router.get("/plans", getFeePlans);
router.post("/plans", validateFeePlan, createFeePlanController);
router.get("/plans/:id", getFeePlan);
router.patch("/plans/:id", validateFeePlanUpdate, updateFeePlanController);
router.delete("/plans/:id", deleteFeePlanController);

router.post("/payments", validateFeePayment, collectFeePaymentController);

router.get("/receipts", getReceiptsController);
router.patch("/receipts/:id", validateReceiptUpdate, updateReceiptController);

export default router;