import express from "express";
import {
  getAllWebpagesMeta,
  getWebpageMetaByPath,
  upsertWebpageMeta,
} from "../controllers/webpagesMeta.controller.js";
import { verifyAdminToken } from "../middleware/admin.middleware.js";

const router = express.Router();

// Public routes for frontend clients to read metadata
router.get("/", getAllWebpagesMeta);
router.get("/page", getWebpageMetaByPath);

// Protected route for Admin to save/update webpage metadata
router.put("/", verifyAdminToken, upsertWebpageMeta);
router.post("/", verifyAdminToken, upsertWebpageMeta);

export default router;
