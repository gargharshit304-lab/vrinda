import { Router } from "express";
import { createProduct, getProductById, getProducts } from "../controllers/productController.js";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.route("/").get(getProducts).post(authMiddleware, adminMiddleware, createProduct);
router.route("/:id").get(getProductById);

export default router;
