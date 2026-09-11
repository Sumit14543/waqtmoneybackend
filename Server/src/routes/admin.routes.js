import express from "express";
import {
  adminLogin,
  adminSendOtp,
  adminVerifyOtp,
  getAdminSummary,
  getAdminLeads,
  exportAdminLeads,
  getAdminLeadById,
  updateLeadStatus,
  getAdminContacts,
} from "../controllers/admin.controller.js";
import { verifyAdminToken } from "../middleware/admin.middleware.js";

const router = express.Router();

// Public login & OTP endpoints
router.post("/login", adminLogin);
router.post("/admin/login", adminLogin);
router.post("/send-otp", adminSendOtp);
router.post("/admin/send-otp", adminSendOtp);
router.post("/verify-otp", adminVerifyOtp);
router.post("/admin/verify-otp", adminVerifyOtp);

// Protected endpoints
router.get("/summary", verifyAdminToken, getAdminSummary);
router.get("/leads/export", verifyAdminToken, exportAdminLeads);
router.get("/leads", verifyAdminToken, getAdminLeads);
router.get("/leads/:id", verifyAdminToken, getAdminLeadById);
router.post("/leads/:id/status", verifyAdminToken, updateLeadStatus);
router.get("/contacts", verifyAdminToken, getAdminContacts);

export default router;
