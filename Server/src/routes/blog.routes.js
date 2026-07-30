import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/blog.controller.js";
import { verifyAdminToken } from "../middleware/admin.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|svg/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEGs, PNGs, WebPs, or SVGs are allowed"));
    }
  },
});

const router = express.Router();

// Public routes
router.get("/", getBlogs);
router.get("/:slug", getBlogBySlug);

// Protected admin routes
router.post("/upload-inline-image", verifyAdminToken, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No image file uploaded" });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  return res.status(200).json({ success: true, url: imageUrl, message: "Image uploaded successfully" });
});
router.post("/", verifyAdminToken, upload.single("image"), createBlog);
router.put("/:id", verifyAdminToken, upload.single("image"), updateBlog);
router.delete("/:id", verifyAdminToken, deleteBlog);

export default router;
