import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import {
  validateStudent,
  validateStudentUpdate,
  validateStudentAccount,
} from "../middleware/student.validation";
import {
  getStudents,
  getStudent,
  createStudentController,
  updateStudentController,
  deleteStudentController,
  getMyPortalController,
  linkStudentAccountController,
  unlinkStudentAccountController,
} from "../controllers/student.controller";

const router = express.Router();

router.use(authenticateUser);

const staffOnly = authorizeRole(ROLES.ADMIN, ROLES.FINANCE, ROLES.TEACHER);

router.get("/", staffOnly, getStudents);
router.post("/", staffOnly, validateStudent, createStudentController);
router.get("/me", getMyPortalController);
router.get("/:id", staffOnly, getStudent);
router.patch("/:id", staffOnly, validateStudentUpdate, updateStudentController);
router.delete("/:id", staffOnly, deleteStudentController);
router.post("/:id/account", staffOnly, validateStudentAccount, linkStudentAccountController);
router.delete("/:id/account", staffOnly, unlinkStudentAccountController);

export default router;