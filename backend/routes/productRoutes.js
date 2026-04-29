import { Router } from "express";
import { createProduct, deleteProduct, getProductById, getProducts, getSimilarProducts } from "../controllers/productController.js";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware.js";
import { uploadProductImages } from "../middleware/uploadMiddleware.js";

const router = Router();

router.route("/").get(getProducts).post(authMiddleware, adminMiddleware, uploadProductImages, createProduct);
router.get("/similar/:id", getSimilarProducts);
router.route("/:id").get(getProductById).delete(authMiddleware, adminMiddleware, deleteProduct);

export default router;
