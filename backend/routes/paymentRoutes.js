import { Router } from "express";
import { createRazorpayOrder, verifyRazorpayPayment } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/create-order", authMiddleware, createRazorpayOrder);
router.post("/verify", authMiddleware, verifyRazorpayPayment);

export default router;
