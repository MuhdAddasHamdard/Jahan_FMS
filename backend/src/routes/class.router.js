import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRoleOrPermission } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import { PERMISSIONS } from "../constants/permissions";
import {
  validateClass,
  validateClassUpdate,
  validateClassSchedule,
  validateClassScheduleUpdate,
  validateCourseMaterial,
  validateCourseMaterialUpdate,
} from "../middleware/class.validation";
import {
  getClasses,
  getClass,
  createClassController,
  updateClassController,
  deleteClassController,
  getClassSchedulesController,
  createClassScheduleController,
  updateClassScheduleController,
  deleteClassScheduleController,
  getClassMaterialsController,
  createCourseMaterialController,
  updateCourseMaterialController,
  deleteCourseMaterialController,
} from "../controllers/class.controller";

const router = express.Router();

router.use(
  authenticateUser,
  authorizeRoleOrPermission(
    PERMISSIONS.CLASSES,
    ROLES.ADMIN,
    ROLES.FINANCE,
    ROLES.TEACHER,
  ),
);

router.get("/", getClasses);
router.post("/", validateClass, createClassController);
router.get("/:id", getClass);
router.patch("/:id", validateClassUpdate, updateClassController);
router.delete("/:id", deleteClassController);

router.get("/:id/schedules", getClassSchedulesController);
router.post("/:id/schedules", validateClassSchedule, createClassScheduleController);
router.patch(
  "/:id/schedules/:scheduleId",
  validateClassScheduleUpdate,
  updateClassScheduleController,
);
router.delete("/:id/schedules/:scheduleId", deleteClassScheduleController);

router.get("/:id/materials", getClassMaterialsController);
router.post("/:id/materials", validateCourseMaterial, createCourseMaterialController);
router.patch(
  "/:id/materials/:materialId",
  validateCourseMaterialUpdate,
  updateCourseMaterialController,
);
router.delete("/:id/materials/:materialId", deleteCourseMaterialController);

export default router;
