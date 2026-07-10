import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import * as merchantController from "../controllers/merchantController.js";

const router = Router();

router.patch("/details", verifyToken, requireRole("merchant"), merchantController.submitDetails);
router.post("/pay-quotation", verifyToken, requireRole("merchant"), merchantController.payQuotation);
router.patch("/:id/quotation", verifyToken, requireRole("admin"), merchantController.sendQuotation);
router.patch("/:id/activate", verifyToken, requireRole("admin"), merchantController.activateMerchant);
router.post("/tickets", verifyToken, requireRole("merchant"), merchantController.raiseTicket);
router.get("/tickets", verifyToken, merchantController.getTickets);
router.patch("/tickets/:ticketId/quotation", verifyToken, requireRole("admin"), merchantController.sendTicketQuotation);
router.post("/tickets/:ticketId/pay", verifyToken, requireRole("merchant"), merchantController.payTicket);
router.patch("/tickets/:ticketId/approve", verifyToken, requireRole("admin"), merchantController.approveTicket);

export default router;
