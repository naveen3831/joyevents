import express from "express";
import { verifyToken } from "../middleware/auth.js";
import * as settingsController from "../controllers/settingsController.js";

const router = express.Router();

router.get("/platform", settingsController.getPlatformSettings);
router.post("/platform", verifyToken, settingsController.savePlatformSettings);
router.get("/commission", settingsController.getCommissionRate);
router.post("/commission", verifyToken, settingsController.saveCommissionRate);
router.get("/homepage", settingsController.getHomepageSettings);
router.post("/homepage", verifyToken, settingsController.saveHomepageSettings);

export default router;
