import express from "express";
import { validateUser, validateProfileUpdate, validateManagedUserUpdate } from "../middleware/user.validation";
import { authorizeRole } from "../middleware/role.middleware";
import { validateRole } from "../middleware/role.validation";
import {
  getUsers,
  getTeachersController,
  createUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  updateManagedUser,
  setUserRole,
  removeUser,
} from "../controllers/user.controller";

import { authenticateUser } from "../middleware/auth.middleware";
import { ROLES } from "../constants/roles";
const router = express.Router();

router.get("/", authenticateUser, authorizeRole(ROLES.ADMIN), getUsers);
router.get(
  "/teachers",
  authenticateUser,
  authorizeRole(ROLES.ADMIN, ROLES.FINANCE),
  getTeachersController,
);
router.post("/", validateUser, createUser);
router.post("/login", loginUser);
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
  "/:id",
  authenticateUser,
  authorizeRole(ROLES.ADMIN),
  validateManagedUserUpdate,
  updateManagedUser,
);
router.delete("/:id", authenticateUser, authorizeRole(ROLES.ADMIN), removeUser);

export default router;