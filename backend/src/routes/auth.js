import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import * as authController from "../controllers/authController.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", verifyToken, authController.getMe);
router.get("/verify", verifyToken, authController.verify);
router.post("/users", verifyToken, requireRole("admin"), authController.createUser);
router.get("/only-user", verifyToken, requireRole("user", "merchant", "admin"), authController.onlyUser);
router.get("/only-merchant", verifyToken, requireRole("merchant", "admin"), authController.onlyMerchant);
router.get("/only-admin", verifyToken, requireRole("admin"), authController.onlyAdmin);
router.get("/users", verifyToken, requireRole("admin"), authController.listUsers);
router.patch("/users/:id", verifyToken, requireRole("admin"), authController.updateUser);
router.patch("/profile", verifyToken, authController.updateProfile);
router.delete("/users/:id", verifyToken, requireRole("admin"), authController.deleteUser);
router.post("/change-password", verifyToken, authController.changePassword);
router.patch("/admin/reset-password/:userId", verifyToken, requireRole("admin"), authController.adminResetPassword);
router.get("/test", authController.test);
router.get("/profile-test", authController.profileTest);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
