import express from "express";
import {
  adminLogin,
  getAdminSummary,
  getAdminLeads,
  getAdminLeadById,
  updateLeadStatus,
  getAdminContacts,
} from "../controllers/admin.controller.js";
import { verifyAdminToken } from "../middleware/admin.middleware.js";

const router = express.Router();

// Public login endpoint
router.post("/login", adminLogin);

// Protected endpoints
router.get("/summary", verifyAdminToken, getAdminSummary);
router.get("/leads", verifyAdminToken, getAdminLeads);
router.get("/leads/:id", verifyAdminToken, getAdminLeadById);
router.post("/leads/:id/status", verifyAdminToken, updateLeadStatus);
router.get("/contacts", verifyAdminToken, getAdminContacts);

export default router;
