import express from "express";
import rateLimit from "express-rate-limit";
import {
  validateUser,
  validateLogin,
  validateProfileUpdate,
  validateManagedUserUpdate,
  validateUserPermissions,
} from "../middleware/user.validation";
import {
  authorizeRole,
  authorizeRoleOrPermission,
} from "../middleware/role.middleware";
import { validateRole } from "../middleware/role.validation";
import {
  getUsers,
  getTeachersController,
  createUser,
  createManagedUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  updateManagedUser,
  setUserRole,
  setUserPermissions,
  removeUser,
} from "../controllers/user.controller";

import { authenticateUser } from "../middleware/auth.middleware";
import { ROLES } from "../constants/roles";
import { PERMISSIONS } from "../constants/permissions";
const router = express.Router();
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});

router.get("/", authenticateUser, authorizeRole(ROLES.ADMIN), getUsers);
router.get(
  "/teachers",
  authenticateUser,
  authorizeRoleOrPermission(PERMISSIONS.CLASSES, ROLES.ADMIN, ROLES.FINANCE),
  getTeachersController,
);
router.post(
  "/",
  authenticateUser,
  authorizeRole(ROLES.ADMIN),
  validateUser,
  createUser,
);
router.post(
  "/manage",
  authenticateUser,
  authorizeRole(ROLES.ADMIN),
  validateUser,
  createManagedUser,
);
router.post("/login", loginRateLimit, validateLogin, loginUser);
router.get("/me", authenticateUser, getCurrentUser);
router.patch(
  "/me",
  authenticateUser,
  validateProfileUpdate,
  updateCurrentUser,
);
router.patch(
  "/:id/role",
  authenticateUser,
  authorizeRole(ROLES.ADMIN),
  validateRole,
  setUserRole,
);
router.patch(
  "/:id/permissions",
  authenticateUser,
  authorizeRole(ROLES.ADMIN),
  validateUserPermissions,
  setUserPermissions,
);
router.patch(
  "/:id",
  authenticateUser,
  authorizeRole(ROLES.ADMIN),
  validateManagedUserUpdate,
  updateManagedUser,
);
router.delete("/:id", authenticateUser, authorizeRole(ROLES.ADMIN), removeUser);

export default router;