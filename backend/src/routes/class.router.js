import { syncMutation } from "../middleware/sync.middleware";
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
router.post("/", validateClass, syncMutation(createClassController));
router.get("/:id", getClass);
router.patch("/:id", validateClassUpdate, syncMutation(updateClassController));
router.delete("/:id", syncMutation(deleteClassController));

router.get("/:id/schedules", getClassSchedulesController);
router.post("/:id/schedules", validateClassSchedule, syncMutation(createClassScheduleController));
router.patch(
  "/:id/schedules/:scheduleId",
  validateClassScheduleUpdate,
  syncMutation(updateClassScheduleController),
);
router.delete("/:id/schedules/:scheduleId", syncMutation(deleteClassScheduleController));

router.get("/:id/materials", getClassMaterialsController);
router.post("/:id/materials", validateCourseMaterial, syncMutation(createCourseMaterialController));
router.patch(
  "/:id/materials/:materialId",
  validateCourseMaterialUpdate,
  syncMutation(updateCourseMaterialController),
);
router.delete("/:id/materials/:materialId", syncMutation(deleteCourseMaterialController));

export default router;
