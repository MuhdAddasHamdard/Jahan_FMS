import { syncMutation } from "../middleware/sync.middleware";
import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { validateInstituteSettings } from "../middleware/settings.validation";
import { ROLES } from "../constants/roles";
import {
  getInstituteSettingsController,
  updateInstituteSettingsController,
} from "../controllers/settings.controller";

const router = express.Router();

router.use(authenticateUser);

router.get("/institute", getInstituteSettingsController);
router.patch(
  "/institute",
  authorizeRole(ROLES.ADMIN),
  validateInstituteSettings,
  syncMutation(updateInstituteSettingsController),
);

export default router;