import { Router } from "express";
import { createOrder, getOrderById, getOrders, updateOrderStatus } from "../controllers/orderController.js";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.route("/").get(authMiddleware, adminMiddleware, getOrders).post(authMiddleware, createOrder);
router.route("/:id").get(authMiddleware, getOrderById).patch(authMiddleware, adminMiddleware, updateOrderStatus);

export default router;
