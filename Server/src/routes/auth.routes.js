import express from "express";
import {
  crmLeadStatus,
  dashboard,
  downloadSanctionLetter,
  login,
  sendLoginOtp,
  signup,
  verifyLoginOtp,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/send-login-otp", sendLoginOtp);
router.post("/verify-login-otp", verifyLoginOtp);
router.get("/dashboard", dashboard);
router.get("/crm-status/:loanId", crmLeadStatus);
router.get("/sanction-letter/:loanId", downloadSanctionLetter);

export default router;
