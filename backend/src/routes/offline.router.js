import express from "express";
import { authenticateUser } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";
import { ROLES } from "../constants/roles";
import {
  getOfflineAdministration, isDeviceId, offlineModes, registerOfflineDevice, setDeviceTrust, setOfflinePolicy,
} from "../services/offline.service";

const router = express.Router();
const adminOnly = authorizeRole(ROLES.ADMIN);
router.use(authenticateUser);

router.get("/", adminOnly, async (_req, res) => res.json(await getOfflineAdministration()));

router.patch("/", adminOnly, async (req, res) => {
  const { offlineMode, offlineMaxDays } = req.body ?? {};
  if (!offlineModes.includes(offlineMode) || !Number.isInteger(offlineMaxDays) || offlineMaxDays < 1 || offlineMaxDays > 7) {
    return res.status(400).json({ message: "Choose an offline mode and a retention period from 1 to 7 days." });
  }
  return res.json(await setOfflinePolicy(offlineMode, offlineMaxDays));
});

router.post("/devices", async (req, res) => {
  const { deviceId, label } = req.body ?? {};
  if (!isDeviceId(deviceId) || typeof label !== "string" || label.trim().length < 1 || label.length > 80) {
    return res.status(400).json({ message: "Enter a valid device identifier and label." });
  }
  if (!await registerOfflineDevice(req.user.id, deviceId, label.trim())) {
    return res.status(409).json({ message: "This account has reached its offline device limit." });
  }
  return res.status(204).send();
});

router.patch("/devices/:userId/:deviceId", adminOnly, async (req, res) => {
  const userId = Number(req.params.userId);
  const { deviceId } = req.params;
  const { trusted } = req.body ?? {};
  if (!Number.isSafeInteger(userId) || userId <= 0 || !isDeviceId(deviceId) || typeof trusted !== "boolean") {
    return res.status(400).json({ message: "Choose a valid device and trust status." });
  }
  if (!await setDeviceTrust(userId, deviceId, trusted)) {
    return res.status(404).json({ message: "Offline device not found." });
  }
  return res.status(204).send();
});

export default router;
