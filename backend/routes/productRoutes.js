import { Router } from "express";
import { createProduct, deleteProduct, getProductById, getProducts } from "../controllers/productController.js";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware.js";
import { uploadProductImages } from "../middleware/uploadMiddleware.js";

const router = Router();

router.route("/").get(getProducts).post(authMiddleware, adminMiddleware, uploadProductImages, createProduct);
router.route("/:id").get(getProductById).delete(authMiddleware, adminMiddleware, deleteProduct);

export default router;
